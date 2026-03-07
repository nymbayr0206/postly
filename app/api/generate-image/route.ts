import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { getImageModelProvider } from "@/lib/image-models/registry";
import { ASPECT_RATIOS, ImageModelError } from "@/lib/image-models/types";
import { calculateFinalCreditCost } from "@/lib/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecords, getModelByName, getTariffById, getUserProfile, getWallet } from "@/lib/user-data";

const BUCKET = "reference-images";

/**
 * Base64 data URL-ийг Supabase Storage-д upload хийж нийтийн https:// URL буцаана.
 * NanoBanana API зөвхөн https:// URL хүлээн авдаг тул шаардлагатай.
 */
async function uploadDataUrlToStorage(dataUrl: string, userId: string): Promise<string> {
  // data:image/jpeg;base64,<payload>
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) throw new ImageModelError("Invalid image data URL.", 400);

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
  if (error) throw new ImageModelError(`Failed to upload reference image: ${error.message}`, 502);

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
  prompt: z.string().trim().min(3, "Prompt must be at least 3 characters.").max(1000, "Prompt is too long."),
  aspect_ratio: z.enum(ASPECT_RATIOS),
  reference_images: z.array(z.string().min(1)).max(3).default([]),
});

function getTariffNameByRole(role: "agent" | "user" | "admin") {
  if (role === "agent") {
    return "Agent";
  }

  return "Regular User";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
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
    return Response.json({ error: "Please sign in to generate images." }, { status: 401 });
  }

  try {
    console.log("[generate-image] step: ensureUserRecords");
    await ensureUserRecords(supabase, user);

    console.log("[generate-image] step: getUserProfile");
    const profile = await getUserProfile(supabase, user.id);

    const modelName = getServerEnv().nanoBananaModelName;
    console.log("[generate-image] step: getModelByName →", modelName);
    const model = await getModelByName(supabase, modelName);
    console.log("[generate-image] model found →", model);

    const wallet = await getWallet(supabase, user.id);
    console.log("[generate-image] step: getWallet → credits:", wallet.credits);

    const tariff = profile.tariff_id
      ? await getTariffById(supabase, profile.tariff_id)
      : await supabase
          .from("tariffs")
          .select("id,name,multiplier,created_at")
          .eq("name", getTariffNameByRole(profile.role))
          .maybeSingle()
          .then(({ data, error }) => {
            if (error || !data) {
              throw new Error("Unable to resolve tariff.");
            }

            return data;
          });

    const cost = calculateFinalCreditCost(model.base_cost, tariff.multiplier);
    console.log("[generate-image] step: cost calculated →", cost, "tariff:", tariff.name);

    if (wallet.credits < cost) {
      return Response.json(
        {
          error: `Insufficient credits. You need ${cost} credits but only have ${wallet.credits}.`,
        },
        { status: 402 },
      );
    }

    console.log("[generate-image] step: getImageModelProvider →", model.name);
    const provider = getImageModelProvider(model.name);

    // base64 data URL-ийг Supabase Storage-ийн нийтийн https:// URL болгон хөрвүүлнэ
    // NanoBanana API зөвхөн https:// URL хүлээн авдаг
    console.log("[generate-image] step: resolveReferenceImages");
    const resolvedImages = await resolveReferenceImages(parsed.data.reference_images, user.id);
    console.log("[generate-image] resolved images:", resolvedImages.map((u) => u.slice(0, 60)));

    console.log("[generate-image] step: calling provider.generateImage");
    const generation = await provider.generateImage({
      prompt: parsed.data.prompt,
      aspectRatio: parsed.data.aspect_ratio,
      referenceImages: resolvedImages,
    });

    const { data: deducted, error: deductionError } = await supabase.rpc("create_generation_and_deduct", {
      p_user_id: user.id,
      p_model_name: model.name,
      p_prompt: parsed.data.prompt,
      p_aspect_ratio: parsed.data.aspect_ratio,
      p_cost: cost,
      p_image_url: generation.imageUrl,
    });

    if (deductionError) {
      if (deductionError.message.includes("INSUFFICIENT_CREDITS")) {
        return Response.json(
          {
            error: "Credits changed during generation. Please top up and try again.",
          },
          { status: 409 },
        );
      }

      return Response.json(
        {
          error: "Image generated, but we could not finalize the transaction. Please contact support.",
        },
        { status: 500 },
      );
    }

    const result = Array.isArray(deducted) ? deducted[0] : deducted;

    return Response.json({
      image_url: generation.imageUrl,
      cost,
      generation_id: result?.generation_id ?? null,
      credits_remaining: result?.remaining_credits ?? wallet.credits - cost,
    });
  } catch (error) {
    console.error("[generate-image] ERROR:", error);

    if (error instanceof ImageModelError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        error: "Unable to generate image right now. Please try again.",
        debug: message,
      },
      { status: 500 },
    );
  }
}

