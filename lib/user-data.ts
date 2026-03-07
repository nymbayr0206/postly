import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { ModelRow, TariffRow, UserRow, WalletRow } from "@/lib/types";

function isDuplicateViolation(code: string | undefined) {
  return code === "23505";
}

export async function ensureUserRecords(supabase: SupabaseClient, user: User) {
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

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
      throw new Error(`Unable to create user profile: ${userInsertError.message}`);
    }
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wallet) {
    const { error: walletInsertError } = await supabase.from("wallets").insert({
      user_id: user.id,
      credits: 0,
    });

    if (walletInsertError && !isDuplicateViolation(walletInsertError.code)) {
      throw new Error(`Unable to create wallet: ${walletInsertError.message}`);
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
    throw new Error(`Unable to load profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Profile does not exist.");
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
    throw new Error(`Unable to load wallet: ${error.message}`);
  }

  if (!data) {
    throw new Error("Wallet does not exist.");
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
    throw new Error(`Unable to load tariff: ${error.message}`);
  }

  if (!data) {
    throw new Error("Tariff does not exist.");
  }

  return data;
}

export async function getModelByName(supabase: SupabaseClient, modelName: string) {
  const { data, error } = await supabase
    .from("models")
    .select("id,name,base_cost,created_at")
    .eq("name", modelName)
    .maybeSingle<ModelRow>();

  if (error) {
    throw new Error(`Unable to load model: ${error.message}`);
  }

  if (!data) {
    throw new Error("Model does not exist.");
  }

  return data;
}

