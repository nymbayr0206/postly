import { z } from "zod";

import { getVideoCreditsForModel } from "@/lib/generation-pricing";
import { issueGenerationCommitToken } from "@/lib/generation-commit-tokens";
import {
  getVideoModelCatalogOrThrow,
  isVideoModelName,
} from "@/lib/video-models/catalog";
import { getVideoModelProvider } from "@/lib/video-models/registry";
import {
  VIDEO_QUALITIES,
  VEO_SEED_MAX,
  VEO_SEED_MIN,
  VideoModelError,
} from "@/lib/video-models/types";
import { calculateFinalCreditCost } from "@/lib/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureUserRecords,
  getEffectiveTariffForProfile,
  getOptionalModelByName,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";

const requestSchema = z.object({
  source_generation_id: z.string().uuid("Үргэлжлүүлэх видео буруу байна."),
  prompt: z.string().trim().min(3, "Промпт хамгийн багадаа 3 тэмдэгт байна."),
  model_name: z.string().trim(),
  quality: z.enum(VIDEO_QUALITIES).default("720p"),
  seed: z
    .number()
    .int("Seed бүхэл тоо байна.")
    .min(VEO_SEED_MIN, `Seed ${VEO_SEED_MIN}-${VEO_SEED_MAX} хооронд байна.`)
    .max(VEO_SEED_MAX, `Seed ${VEO_SEED_MIN}-${VEO_SEED_MAX} хооронд байна.`)
    .optional(),
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
      { error: parsed.error.issues[0]?.message ?? "Хүсэлтийн мэдээлэл буруу байна." },
      { status: 400 },
    );
  }

  if (!isVideoModelName(parsed.data.model_name)) {
    return Response.json({ error: "Дэмжигдэхгүй видео model байна." }, { status: 400 });
  }

  if (!parsed.data.model_name.startsWith("veo")) {
    return Response.json({ error: "Real continue зөвхөн Veo model дээр ажиллана." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Видео үргэлжлүүлэхийн тулд нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    await ensureUserRecords(supabase, user);

    const [profile, wallet, sourceResult] = await Promise.all([
      getUserProfile(supabase, user.id),
      getWallet(supabase, user.id),
      supabase
        .from("video_generations")
        .select("id,user_id,model_name,image_url,quality,seed,provider_task_id")
        .eq("id", parsed.data.source_generation_id)
        .eq("user_id", user.id)
        .maybeSingle<{
          id: string;
          user_id: string;
          model_name: string;
          image_url: string;
          quality: string;
          seed: number | null;
          provider_task_id: string | null;
        }>(),
    ]);

    if (sourceResult.error) {
      throw new Error(`Үргэлжлүүлэх эх видео ачаалж чадсангүй: ${sourceResult.error.message}`);
    }

    const sourceGeneration = sourceResult.data;
    if (!sourceGeneration) {
      return Response.json({ error: "Үргэлжлүүлэх видео олдсонгүй." }, { status: 404 });
    }

    if (!sourceGeneration.model_name.startsWith("veo")) {
      return Response.json({ error: "Зөвхөн Veo video-г ингэж үргэлжлүүлнэ." }, { status: 400 });
    }

    if (!sourceGeneration.provider_task_id?.trim()) {
      return Response.json(
        { error: "Энэ хуучин Veo video дээр real continue хийх task id хадгалагдаагүй байна." },
        { status: 400 },
      );
    }

    const modelConfig = getVideoModelCatalogOrThrow(parsed.data.model_name);
    const modelRow = await getOptionalModelByName(supabase, parsed.data.model_name);
    const model = modelRow ?? {
      id: `fallback:${modelConfig.name}`,
      name: modelConfig.name,
      base_cost: modelConfig.defaultBaseCost,
      created_at: new Date(0).toISOString(),
    };

    const tariff = await getEffectiveTariffForProfile(supabase, profile);
    const baseCost = getVideoCreditsForModel(
      model.name,
      modelConfig.defaultDuration,
      parsed.data.quality,
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

    const provider = getVideoModelProvider(model.name);
    if (typeof provider.extendVideo !== "function") {
      return Response.json({ error: "Энэ model real continue дэмжихгүй." }, { status: 400 });
    }

    const seedForExtension = parsed.data.seed ?? sourceGeneration.seed ?? undefined;
    const generation = await provider.extendVideo({
      modelName: model.name,
      prompt: parsed.data.prompt,
      sourceTaskId: sourceGeneration.provider_task_id,
      quality: parsed.data.quality,
      seed: seedForExtension,
    });
    const resolvedSeed = generation.seed ?? seedForExtension ?? null;
    const serverToken = await issueGenerationCommitToken(createSupabaseAdminClient(), {
      userId: user.id,
      modelName: model.name,
      kind: "video",
      chargedCost: cost,
    });

    const { data: deducted, error: deductionError } = await supabase.rpc(
      "create_video_generation_and_deduct",
      {
        p_user_id: user.id,
        p_model_name: model.name,
        p_prompt: parsed.data.prompt,
        p_image_url: sourceGeneration.image_url,
        p_video_url: generation.videoUrl,
        p_duration: generation.duration ?? modelConfig.defaultDuration,
        p_quality: generation.quality ?? parsed.data.quality,
        p_server_token: serverToken,
        p_seed: resolvedSeed,
        p_provider_task_id: generation.providerTaskId ?? null,
        p_parent_generation_id: sourceGeneration.id,
      },
    );

    if (deductionError) {
      if (deductionError.message.includes("INSUFFICIENT_CREDITS")) {
        return Response.json(
          { error: "Үүсгэлтийн явцад кредит өөрчлөгдсөн байна. Дахин оролдоно уу." },
          { status: 409 },
        );
      }

      if (deductionError.message.includes("INVALID_SEED")) {
        return Response.json(
          { error: `Seed ${VEO_SEED_MIN}-${VEO_SEED_MAX} хооронд байна.` },
          { status: 400 },
        );
      }

      if (deductionError.message.includes("INVALID_PARENT_GENERATION")) {
        return Response.json({ error: "Үргэлжлүүлэх эх видео буруу байна." }, { status: 400 });
      }

      return Response.json(
        { error: "Видео амжилттай үргэлжилсэн ч төлбөрийн гүйлгээг дуусгаж чадсангүй." },
        { status: 500 },
      );
    }

    const result = Array.isArray(deducted) ? deducted[0] : deducted;

    return Response.json({
      video_url: generation.videoUrl,
      cost: result?.charged_cost ?? cost,
      generation_id: result?.generation_id ?? null,
      credits_remaining:
        result?.remaining_credits ?? wallet.credits - (result?.charged_cost ?? cost),
      seed: resolvedSeed,
    });
  } catch (error) {
    console.error("[extend-video] ERROR:", error);

    if (error instanceof VideoModelError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      { error: "Одоогоор видео үргэлжлүүлэх боломжгүй байна. Дахин оролдоно уу." },
      { status: 500 },
    );
  }
}
