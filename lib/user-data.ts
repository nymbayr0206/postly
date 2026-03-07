import type { SupabaseClient, User } from "@supabase/supabase-js";

import { buildGenerationPricingPreview } from "@/lib/pricing";
import type {
  AgentRequestRow,
  GenerationPricingPreview,
  ModelRow,
  TariffRow,
  UserRow,
  WalletRow,
} from "@/lib/types";

function isDuplicateViolation(code: string | undefined) {
  return code === "23505";
}

export async function ensureUserRecords(supabase: SupabaseClient, user: User) {
  const { data: profile } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();

  if (!profile) {
    const { data: regularTariff } = await supabase
      .from("tariffs")
      .select("id")
      .eq("name", "Regular User")
      .maybeSingle();

    const { error: userInsertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email ?? "",
      role: "user",
      tariff_id: regularTariff?.id ?? null,
    });

    if (userInsertError && !isDuplicateViolation(userInsertError.code)) {
      throw new Error(`Хэрэглэгчийн профайл үүсгэж чадсангүй: ${userInsertError.message}`);
    }
  }

  const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", user.id).maybeSingle();

  if (!wallet) {
    const { error: walletInsertError } = await supabase.from("wallets").insert({
      user_id: user.id,
      credits: 0,
    });

    if (walletInsertError && !isDuplicateViolation(walletInsertError.code)) {
      throw new Error(`Хэтэвч үүсгэж чадсангүй: ${walletInsertError.message}`);
    }
  }
}

export async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,role,tariff_id,created_at")
    .eq("id", userId)
    .maybeSingle<UserRow>();

  if (error) {
    throw new Error(`Профайл ачаалж чадсангүй: ${error.message}`);
  }

  if (!data) {
    throw new Error("Профайл олдсонгүй.");
  }

  return data;
}

export async function getWallet(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("id,user_id,credits,created_at")
    .eq("user_id", userId)
    .maybeSingle<WalletRow>();

  if (error) {
    throw new Error(`Хэтэвч ачаалж чадсангүй: ${error.message}`);
  }

  if (!data) {
    throw new Error("Хэтэвч олдсонгүй.");
  }

  return data;
}

export async function getTariffById(supabase: SupabaseClient, tariffId: string) {
  const { data, error } = await supabase
    .from("tariffs")
    .select("id,name,multiplier,created_at")
    .eq("id", tariffId)
    .maybeSingle<TariffRow>();

  if (error) {
    throw new Error(`Тариф ачаалж чадсангүй: ${error.message}`);
  }

  if (!data) {
    throw new Error("Тариф олдсонгүй.");
  }

  return data;
}

export async function getTariffs(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tariffs")
    .select("id,name,multiplier,created_at")
    .order("created_at", { ascending: true })
    .returns<TariffRow[]>();

  if (error) {
    throw new Error(`Тарифуудыг ачаалж чадсангүй: ${error.message}`);
  }

  return data ?? [];
}

export async function getModelByName(supabase: SupabaseClient, modelName: string) {
  const { data, error } = await supabase
    .from("models")
    .select("id,name,base_cost,created_at")
    .eq("name", modelName)
    .maybeSingle<ModelRow>();

  if (error) {
    throw new Error(`Модель ачаалж чадсангүй: ${error.message}`);
  }

  if (!data) {
    throw new Error("Модель олдсонгүй.");
  }

  return data;
}

export async function getModels(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("models")
    .select("id,name,base_cost,created_at")
    .order("created_at", { ascending: true })
    .returns<ModelRow[]>();

  if (error) {
    throw new Error(`Моделийн жагсаалтыг ачаалж чадсангүй: ${error.message}`);
  }

  return data ?? [];
}

export async function getGenerationPricingPreview(
  supabase: SupabaseClient,
  profile: Pick<UserRow, "role" | "tariff_id">,
  modelName: string,
): Promise<GenerationPricingPreview> {
  const [model, tariffs] = await Promise.all([
    getModelByName(supabase, modelName),
    getTariffs(supabase),
  ]);

  return buildGenerationPricingPreview({
    modelName: model.name,
    baseCost: model.base_cost,
    tariffs,
    currentRole: profile.role,
    currentTariffId: profile.tariff_id,
  });
}

export async function getAgentRequestByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("agent_requests")
    .select("id,user_id,amount_mnt,payment_screenshot_url,status,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle<AgentRequestRow>();

  if (error) {
    throw new Error(`Агент хүсэлт ачаалж чадсангүй: ${error.message}`);
  }

  return data ?? null;
}
