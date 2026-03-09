"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export type ReferralActionState = {
  error?: string;
  success?: string;
};

const EMPTY_REFERRAL_ACTION_STATE: ReferralActionState = {};

function mapReferralRpcError(message: string) {
  if (message.includes("INVALID_AMOUNT")) {
    return "Дүн буруу байна.";
  }

  if (message.includes("INSUFFICIENT_REFERRAL_BALANCE")) {
    return "Урамшууллын мөнгө хүрэлцэхгүй байна.";
  }

  if (message.includes("AMOUNT_TOO_SMALL")) {
    return "Энэ дүнгээр кредит хөрвүүлэх боломжгүй байна.";
  }

  if (message.includes("BANK_DETAILS_REQUIRED")) {
    return "Банкны мэдээллээ бүтэн оруулна уу.";
  }

  return message;
}

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return { supabase, user };
}

export async function convertReferralRewardToCreditsAction(
  previousState: ReferralActionState = EMPTY_REFERRAL_ACTION_STATE,
  formData: FormData,
): Promise<ReferralActionState> {
  void previousState;
  const amountMnt = Number(formData.get("amount_mnt"));

  if (!Number.isInteger(amountMnt) || amountMnt <= 0) {
    return { error: "Хөрвүүлэх дүнгээ зөв оруулна уу." };
  }

  const { supabase } = await requireAuthenticatedUser();
  const { error } = await supabase.rpc("convert_referral_balance_to_credits", {
    p_amount_mnt: amountMnt,
  });

  if (error) {
    return { error: mapReferralRpcError(error.message) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/referrals");

  return {
    success: "Урамшууллын мөнгийг кредит болголоо.",
  };
}

export async function createReferralPayoutRequestAction(
  previousState: ReferralActionState = EMPTY_REFERRAL_ACTION_STATE,
  formData: FormData,
): Promise<ReferralActionState> {
  void previousState;
  const amountMnt = Number(formData.get("amount_mnt"));
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const accountHolder = String(formData.get("account_holder") ?? "").trim();
  const accountNumber = String(formData.get("account_number") ?? "").trim();

  if (!Number.isInteger(amountMnt) || amountMnt <= 0) {
    return { error: "Татан авах дүнгээ зөв оруулна уу." };
  }

  if (!bankName || !accountHolder || !accountNumber) {
    return { error: "Банкны мэдээллээ бүтэн оруулна уу." };
  }

  const { supabase } = await requireAuthenticatedUser();
  const { error } = await supabase.rpc("create_referral_payout_request", {
    p_amount_mnt: amountMnt,
    p_bank_name: bankName,
    p_account_holder: accountHolder,
    p_account_number: accountNumber,
  });

  if (error) {
    return { error: mapReferralRpcError(error.message) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/referrals");

  return {
    success: "Урамшууллын мөнгө татах хүсэлтийг илгээлээ.",
  };
}
