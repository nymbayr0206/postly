import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

type GenerationKind = "image" | "audio" | "video";

const TOKEN_TTL_MS = 5 * 60 * 1000;

export async function issueGenerationCommitToken(
  admin: SupabaseClient,
  params: {
    userId: string;
    modelName: string;
    kind: GenerationKind;
    chargedCost: number;
  },
) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await admin.from("server_generation_tokens").insert({
    id: token,
    user_id: params.userId,
    model_name: params.modelName,
    generation_kind: params.kind,
    charged_cost: params.chargedCost,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`Server commit token үүсгэж чадсангүй: ${error.message}`);
  }

  return token;
}
