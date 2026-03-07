import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { getVideoModelProvider } from "@/lib/video-models/registry";
import { VIDEO_QUALITIES, VideoModelError } from "@/lib/video-models/types";
import { calculateFinalCreditCost, getDefaultTariffNameForRole } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecords, getModelByName, getTariffById, getUserProfile, getWallet } from "@/lib/user-data";

const requestSchema = z.object({
  prompt: z.string().trim().min(3, "Промпт хамгийн багадаа 3 тэмдэгт байх ёстой.").max(1000),
  image_url: z.string().url("Хүчинтэй зургийн холбоос шаардлагатай."),
  duration: z.union([z.literal(5), z.literal(10)]).default(5),
  quality: z.enum(VIDEO_QUALITIES).default("720p"),
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

  // 1080p only supports 5-second videos
  if (parsed.data.quality === "1080p" && parsed.data.duration === 10) {
    return Response.json(
      { error: "1080p чанар зөвхөн 5 секундын видеод дэмжигдэнэ." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Видео үүсгэхийн тулд нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    await ensureUserRecords(supabase, user);

    const profile = await getUserProfile(supabase, user.id);
    const modelName = getServerEnv().runwayModelName;
    const model = await getModelByName(supabase, modelName);
    const wallet = await getWallet(supabase, user.id);

    const tariff = profile.tariff_id
      ? await getTariffById(supabase, profile.tariff_id)
      : await supabase
          .from("tariffs")
          .select("id,name,multiplier,created_at")
          .eq("name", getDefaultTariffNameForRole(profile.role))
          .maybeSingle()
          .then(({ data, error }) => {
            if (error || !data) throw new Error("Тариф олдсонгүй.");
            return data;
          });

    const cost = calculateFinalCreditCost(model.base_cost, tariff.multiplier);

    if (wallet.credits < cost) {
      return Response.json(
        { error: `Кредит хүрэлцэхгүй байна. ${cost} кредит хэрэгтэй, таны үлдэгдэл ${wallet.credits}.` },
        { status: 402 },
      );
    }

    const provider = getVideoModelProvider(model.name);

    const generation = await provider.generateVideo({
      prompt: parsed.data.prompt,
      imageUrl: parsed.data.image_url,
      duration: parsed.data.duration,
      quality: parsed.data.quality,
    });

    const { data: deducted, error: deductionError } = await supabase.rpc(
      "create_video_generation_and_deduct",
      {
        p_user_id: user.id,
        p_model_name: model.name,
        p_prompt: parsed.data.prompt,
        p_image_url: parsed.data.image_url,
        p_video_url: generation.videoUrl,
        p_duration: parsed.data.duration,
        p_quality: parsed.data.quality,
        p_cost: cost,
      },
    );

    if (deductionError) {
      if (deductionError.message.includes("INSUFFICIENT_CREDITS")) {
        return Response.json(
          { error: "Үүсгэлтийн явцад кредит өөрчлөгдсөн байна. Кредитээ цэнэглээд дахин оролдоно уу." },
          { status: 409 },
        );
      }
      return Response.json(
        { error: "Видео амжилттай үүссэн ч төлбөрийн гүйлгээг дуусгаж чадсангүй. Дэмжлэгтэй холбогдоно уу." },
        { status: 500 },
      );
    }

    const result = Array.isArray(deducted) ? deducted[0] : deducted;

    return Response.json({
      video_url: generation.videoUrl,
      cost,
      generation_id: result?.generation_id ?? null,
      credits_remaining: result?.remaining_credits ?? wallet.credits - cost,
    });
  } catch (error) {
    console.error("[generate-video] ERROR:", error);

    if (error instanceof VideoModelError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Одоогоор видео үүсгэх боломжгүй байна. Дахин оролдоно уу.", debug: message },
      { status: 500 },
    );
  }
}
