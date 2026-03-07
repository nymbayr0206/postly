"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Admin permissions required.");
  }

  return supabase;
}

export async function updateTariffAction(formData: FormData) {
  const tariffId = String(formData.get("tariff_id") ?? "");
  const multiplier = Number(formData.get("multiplier"));

  if (!tariffId || !Number.isInteger(multiplier) || multiplier <= 0) {
    throw new Error("Invalid tariff update.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.from("tariffs").update({ multiplier }).eq("id", tariffId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/credits");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
}

export async function updateModelCostAction(formData: FormData) {
  const modelId = String(formData.get("model_id") ?? "");
  const baseCost = Number(formData.get("base_cost"));

  if (!modelId || !Number.isInteger(baseCost) || baseCost <= 0) {
    throw new Error("Invalid model update.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.from("models").update({ base_cost: baseCost }).eq("id", modelId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/credits");
}

async function processCreditRequest(formData: FormData, status: "approved" | "rejected") {
  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    throw new Error("Invalid credit request.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.rpc("process_credit_request", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/credits");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
}

export async function approveCreditRequestAction(formData: FormData) {
  await processCreditRequest(formData, "approved");
}

export async function rejectCreditRequestAction(formData: FormData) {
  await processCreditRequest(formData, "rejected");
}

