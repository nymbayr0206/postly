import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { getVideoModelProvider } from "@/lib/video-models/registry";
import { VIDEO_DURATIONS, VIDEO_QUALITIES, VideoModelError } from "@/lib/video-models/types";
import { calculateFinalCreditCost } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecords, getModelByName, getTariffById, getUserProfile, getWallet } from "@/lib/user-data";

const requestSchema = z.object({
  prompt: z.string().trim().min(3, "Prompt must be at least 3 characters.").max(1000),
  image_url: z.string().url("A valid image URL is required."),
  duration: z.union([z.literal(5), z.literal(10)]).default(5),
  quality: z.enum(VIDEO_QUALITIES).default("720p"),
});

function getTariffNameByRole(role: "agent" | "user" | "admin") {
  return role === "agent" ? "Agent" : "Regular User";
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
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  // 1080p only supports 5-second videos
  if (parsed.data.quality === "1080p" && parsed.data.duration === 10) {
    return Response.json(
      { error: "1080p quality only supports 5-second videos." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Please sign in to generate videos." }, { status: 401 });
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
          .eq("name", getTariffNameByRole(profile.role))
          .maybeSingle()
          .then(({ data, error }) => {
            if (error || !data) throw new Error("Unable to resolve tariff.");
            return data;
          });

    const cost = calculateFinalCreditCost(model.base_cost, tariff.multiplier);

    if (wallet.credits < cost) {
      return Response.json(
        { error: `Insufficient credits. You need ${cost} but only have ${wallet.credits}.` },
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
          { error: "Credits changed during generation. Please top up and try again." },
          { status: 409 },
        );
      }
      return Response.json(
        { error: "Video generated, but we could not finalize the transaction. Please contact support." },
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
      { error: "Unable to generate video right now. Please try again.", debug: message },
      { status: 500 },
    );
  }
}
