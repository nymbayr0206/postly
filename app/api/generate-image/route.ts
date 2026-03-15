import { z } from "zod";

import { getActiveModelNames } from "@/lib/env";
import { getImageResolutionCost, type ImageResolution } from "@/lib/generation-pricing";
import { issueGenerationCommitToken } from "@/lib/generation-commit-tokens";
import { getImageModelProvider } from "@/lib/image-models/registry";
import { ASPECT_RATIOS, ImageModelError } from "@/lib/image-models/types";
import { calculateFinalCreditCost } from "@/lib/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureUserRecords,
  getEffectiveTariffForProfile,
  getModelByName,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";

const BUCKET = "reference-images";
const LEGACY_VERTICAL_STORAGE_ASPECT_RATIO = "4:5";

/**
 * Base64 data URL-ийг Supabase Storage-д upload хийж нийтийн https:// URL буцаана.
 * NanoBanana API зөвхөн https:// URL хүлээн авдаг тул шаардлагатай.
 */
async function uploadDataUrlToStorage(dataUrl: string, userId: string): Promise<string> {
  // data:image/jpeg;base64,<payload>
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) throw new ImageModelError("Зургийн data URL буруу байна.", 400);

  const mimeType = match[1];                          // e.g. "image/jpeg"
  const ext = mimeType.split("/")[1].split("+")[0];   // e.g. "jpeg"
  const buffer = Buffer.from(match[2], "base64");
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createSupabaseAdminClient();

  // Bucket байхгүй бол үүсгэнэ (нийтийн)
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true });
  }

  const { error } = await admin.storage.from(BUCKET).upload(filename, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new ImageModelError(`Лавлах зургийг байршуулж чадсангүй: ${error.message}`, 502);

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(filename);
  return urlData.publicUrl;
}

/**
 * reference_images массив дахь data URL-үүдийг Supabase Storage URL болгон хөрвүүлнэ.
 * Аль хэдийн https:// URL байвал тэр чигтээ үлдээнэ.
 */
async function resolveReferenceImages(images: string[], userId: string): Promise<string[]> {
  return Promise.all(
    images.map((img) =>
      img.startsWith("data:image/") ? uploadDataUrlToStorage(img, userId) : Promise.resolve(img),
    ),
  );
}

function isAspectRatioConstraintError(error: { message?: string; details?: string } | null | undefined) {
  return (
    error?.message?.includes("generations_aspect_ratio_check") ||
    error?.details?.includes("generations_aspect_ratio_check")
  );
}

const requestSchema = z.object({
  prompt: z.string().trim().min(3, "Промпт хамгийн багадаа 3 тэмдэгт байх ёстой."),
  aspect_ratio: z.enum(ASPECT_RATIOS),
  resolution: z.enum(["1k", "2k", "4k"] as const).default("1k"),
  reference_images: z.array(z.string().min(1)).max(3).default([]),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON хүсэлтийн бие буруу байна." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Хүсэлтийн мэдээлэл буруу байна.",
      },
      { status: 400 },
    );
  }

  const requestData = parsed.data;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Зураг үүсгэхийн тулд нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    await ensureUserRecords(supabase, user);
    const userId = user.id;

    const { nanoBananaModelName: modelName } = getActiveModelNames();
    const [profile, model, wallet] = await Promise.all([
      getUserProfile(supabase, userId),
      getModelByName(supabase, modelName),
      getWallet(supabase, userId),
    ]);
    const tariff = await getEffectiveTariffForProfile(supabase, profile);
    const baseCost = getImageResolutionCost(
      requestData.resolution as ImageResolution,
      model.base_cost,
    );
    const cost = calculateFinalCreditCost(baseCost, tariff.multiplier);

    if (wallet.credits < cost) {
      return Response.json(
        {
          error: `Кредит хүрэлцэхгүй байна. ${cost} кредит хэрэгтэй, таны үлдэгдэл ${wallet.credits}.`,
        },
        { status: 402 },
      );
    }

    const provider = getImageModelProvider(model.name);

    // base64 data URL-ийг Supabase Storage-ийн нийтийн https:// URL болгон хөрвүүлнэ
    // NanoBanana API зөвхөн https:// URL хүлээн авдаг
    const resolvedImages = await resolveReferenceImages(requestData.reference_images, userId);
    const generation = await provider.generateImage({
      prompt: requestData.prompt,
      aspectRatio: requestData.aspect_ratio,
      resolution: requestData.resolution,
      referenceImages: resolvedImages,
    });
    const serverToken = await issueGenerationCommitToken(createSupabaseAdminClient(), {
      userId,
      modelName: model.name,
      kind: "image",
      chargedCost: cost,
    });

    async function commitGeneration(persistedAspectRatio: string) {
      return supabase.rpc("create_generation_and_deduct", {
        p_user_id: userId,
        p_model_name: model.name,
        p_prompt: requestData.prompt,
        p_aspect_ratio: persistedAspectRatio,
        p_image_url: generation.imageUrl,
        p_server_token: serverToken,
      });
    }

    let { data: deducted, error: deductionError } = await commitGeneration(requestData.aspect_ratio);

    if (
      deductionError &&
      requestData.aspect_ratio === "9:16" &&
      isAspectRatioConstraintError(deductionError)
    ) {
      console.warn(
        "[generate-image] falling back to legacy storage aspect ratio 4:5 for 9:16 until DB migration is applied",
      );
      ({ data: deducted, error: deductionError } = await commitGeneration(
        LEGACY_VERTICAL_STORAGE_ASPECT_RATIO,
      ));
    }

    if (deductionError) {
      console.error("[generate-image] create_generation_and_deduct failed", deductionError);
      if (deductionError.message.includes("INSUFFICIENT_CREDITS")) {
        return Response.json(
          {
            error: "Үүсгэлтийн явцад кредит өөрчлөгдсөн байна. Кредитээ цэнэглээд дахин оролдоно уу.",
          },
          { status: 409 },
        );
      }

      if (isAspectRatioConstraintError(deductionError)) {
        return Response.json(
          {
            error: "Supabase database дээрх aspect ratio constraint шинэчлэгдээгүй байна. 9:16 ratio-г идэвхжүүлэх migration-аа ажиллуулна уу.",
          },
          { status: 409 },
        );
      }

      return Response.json(
        {
          error: "Зураг амжилттай үүссэн ч төлбөрийн гүйлгээг дуусгаж чадсангүй. Дэмжлэгтэй холбогдоно уу.",
        },
        { status: 500 },
      );
    }

    const result = Array.isArray(deducted) ? deducted[0] : deducted;

    return Response.json({
      image_url: generation.imageUrl,
      cost: result?.charged_cost ?? cost,
      generation_id: result?.generation_id ?? null,
      credits_remaining: result?.remaining_credits ?? wallet.credits - (result?.charged_cost ?? cost),
    });
  } catch (error) {
    console.error("[generate-image] ERROR:", error);

    if (error instanceof ImageModelError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      {
        error: "Одоогоор зураг үүсгэх боломжгүй байна. Дахин оролдоно уу.",
      },
      { status: 500 },
    );
  }
}
