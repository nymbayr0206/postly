import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { getAudioModelProvider } from "@/lib/audio-models/registry";
import { ELEVENLABS_VOICES, AudioModelError } from "@/lib/audio-models/types";
import { calculateFinalCreditCost } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecords, getModelByName, getTariffById, getUserProfile, getWallet } from "@/lib/user-data";

const dialogueLineSchema = z.object({
  text: z.string().trim().min(1, "Dialogue text cannot be empty.").max(5000),
  voice: z.enum(ELEVENLABS_VOICES),
});

const requestSchema = z.object({
  dialogue: z
    .array(dialogueLineSchema)
    .min(1, "At least one dialogue line is required.")
    .max(20, "Too many dialogue lines (max 20)."),
  stability: z.number().min(0).max(1).default(0.5),
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Please sign in to generate audio." }, { status: 401 });
  }

  try {
    await ensureUserRecords(supabase, user);

    const profile = await getUserProfile(supabase, user.id);
    const modelName = getServerEnv().elevenlabsModelName;
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
        { error: `Insufficient credits. You need ${cost} credits but only have ${wallet.credits}.` },
        { status: 402 },
      );
    }

    const provider = getAudioModelProvider(model.name);

    const generation = await provider.generateAudio({
      dialogue: parsed.data.dialogue,
      stability: parsed.data.stability,
    });

    // Build a text summary of the dialogue for the prompt field
    const promptSummary = parsed.data.dialogue
      .map((line) => `${line.voice}: ${line.text}`)
      .join(" | ")
      .slice(0, 500);

    const { data: deducted, error: deductionError } = await supabase.rpc(
      "create_audio_generation_and_deduct",
      {
        p_user_id: user.id,
        p_model_name: model.name,
        p_prompt: promptSummary,
        p_cost: cost,
        p_audio_url: generation.audioUrl,
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
        { error: "Audio generated, but we could not finalize the transaction. Please contact support." },
        { status: 500 },
      );
    }

    const result = Array.isArray(deducted) ? deducted[0] : deducted;

    return Response.json({
      audio_url: generation.audioUrl,
      cost,
      generation_id: result?.generation_id ?? null,
      credits_remaining: result?.remaining_credits ?? wallet.credits - cost,
    });
  } catch (error) {
    console.error("[generate-audio] ERROR:", error);

    if (error instanceof AudioModelError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Unable to generate audio right now. Please try again.", debug: message },
      { status: 500 },
    );
  }
}
