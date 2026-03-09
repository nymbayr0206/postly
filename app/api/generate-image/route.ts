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

const requestSchema = z.object({
  prompt: z.string().trim().min(3, "Промпт хамгийн багадаа 3 тэмдэгт байх ёстой.").max(1000, "Промпт хэт урт байна."),
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

    const { nanoBananaModelName: modelName } = getActiveModelNames();
    const [profile, model, wallet] = await Promise.all([
      getUserProfile(supabase, user.id),
      getModelByName(supabase, modelName),
      getWallet(supabase, user.id),
    ]);
    const tariff = await getEffectiveTariffForProfile(supabase, profile);
    const baseCost = getImageResolutionCost(parsed.data.resolution as ImageResolution);
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
    const resolvedImages = await resolveReferenceImages(parsed.data.reference_images, user.id);
    const generation = await provider.generateImage({
      prompt: parsed.data.prompt,
      aspectRatio: parsed.data.aspect_ratio,
      resolution: parsed.data.resolution,
      referenceImages: resolvedImages,
    });
    const serverToken = await issueGenerationCommitToken(createSupabaseAdminClient(), {
      userId: user.id,
      modelName: model.name,
      kind: "image",
      chargedCost: cost,
    });

    const { data: deducted, error: deductionError } = await supabase.rpc("create_generation_and_deduct", {
      p_user_id: user.id,
      p_model_name: model.name,
      p_prompt: parsed.data.prompt,
      p_aspect_ratio: parsed.data.aspect_ratio,
      p_image_url: generation.imageUrl,
      p_server_token: serverToken,
    });

    if (deductionError) {
      if (deductionError.message.includes("INSUFFICIENT_CREDITS")) {
        return Response.json(
          {
            error: "Үүсгэлтийн явцад кредит өөрчлөгдсөн байна. Кредитээ цэнэглээд дахин оролдоно уу.",
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

    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        error: "Одоогоор зураг үүсгэх боломжгүй байна. Дахин оролдоно уу.",
        debug: message,
      },
      { status: 500 },
    );
  }
}
