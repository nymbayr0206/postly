"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function mapAdminRpcError(message: string) {
  if (message.includes("PAYMENT_PROOF_REQUIRED")) {
    return "Шилжүүлгийн баримтгүй хүсэлтийг зөвшөөрөх боломжгүй.";
  }

  return message;
}

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
    throw new Error("Админы эрх шаардлагатай.");
  }

  return supabase;
}

function revalidateAdminAndDashboardPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/credits");
  revalidatePath("/admin/agents");
  revalidatePath("/admin/referrals");
  revalidatePath("/admin/lessons");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/image");
  revalidatePath("/dashboard/audio");
  revalidatePath("/dashboard/video");
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/agent-onboarding");
  revalidatePath("/dashboard/lessons");
}

export async function updateTariffAction(formData: FormData) {
  const tariffId = String(formData.get("tariff_id") ?? "");
  const multiplier = Number(formData.get("multiplier"));

  if (!tariffId || !Number.isInteger(multiplier) || multiplier <= 0) {
    throw new Error("Тарифын утга буруу байна.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.from("tariffs").update({ multiplier }).eq("id", tariffId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminAndDashboardPaths();
}

export async function updateModelCostAction(formData: FormData) {
  const modelId = String(formData.get("model_id") ?? "");
  const baseCost = Number(formData.get("base_cost"));

  if (!modelId || !Number.isInteger(baseCost) || baseCost <= 0) {
    throw new Error("Моделийн үнэ буруу байна.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.from("models").update({ base_cost: baseCost }).eq("id", modelId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminAndDashboardPaths();
}

export async function updateCreditUnitPriceAction(formData: FormData) {
  const creditPriceMnt = Number(formData.get("credit_price_mnt"));

  if (!Number.isInteger(creditPriceMnt) || creditPriceMnt <= 0) {
    throw new Error("1 кредитийн төгрөгийн үнэ буруу байна.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.from("platform_settings").upsert({
    id: true,
    credit_price_mnt: creditPriceMnt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminAndDashboardPaths();
}

async function processCreditRequest(formData: FormData, status: "approved" | "rejected") {
  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    throw new Error("Кредит хүсэлтийн мэдээлэл буруу байна.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.rpc("process_credit_request", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminAndDashboardPaths();
}

async function processAgentRequest(formData: FormData, status: "approved" | "rejected") {
  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    throw new Error("Агент хүсэлтийн мэдээлэл буруу байна.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.rpc("process_agent_request", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) {
    throw new Error(mapAdminRpcError(error.message));
  }

  revalidateAdminAndDashboardPaths();
}

async function processReferralPayoutRequest(formData: FormData, status: "approved" | "rejected") {
  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    throw new Error("Урамшууллын мөнгөний хүсэлтийн мэдээлэл буруу байна.");
  }

  const supabase = await requireAdmin();

  const { error } = await supabase.rpc("process_referral_payout_request", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminAndDashboardPaths();
}

export async function approveCreditRequestAction(formData: FormData) {
  await processCreditRequest(formData, "approved");
}

export async function rejectCreditRequestAction(formData: FormData) {
  await processCreditRequest(formData, "rejected");
}

export async function approveAgentRequestAction(formData: FormData) {
  await processAgentRequest(formData, "approved");
}

export async function rejectAgentRequestAction(formData: FormData) {
  await processAgentRequest(formData, "rejected");
}

export async function approveReferralPayoutRequestAction(formData: FormData) {
  await processReferralPayoutRequest(formData, "approved");
}

export async function rejectReferralPayoutRequestAction(formData: FormData) {
  await processReferralPayoutRequest(formData, "rejected");
}
