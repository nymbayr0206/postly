"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCreditPackageByKey, getTotalCredits } from "@/lib/credit-packages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export async function createCreditRequestAction(formData: FormData) {
  const packageKey = String(formData.get("package_key") ?? "");
  const selectedPackage = getCreditPackageByKey(packageKey);

  if (!selectedPackage) {
    throw new Error("Кредитийн багц буруу байна.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Нэвтэрсэн байх шаардлагатай.");
  }

  const { error } = await supabase.from("credit_requests").insert({
    user_id: user.id,
    amount: getTotalCredits(selectedPackage),
    amount_mnt: selectedPackage.priceMnt,
    bonus_credits: Math.round((selectedPackage.baseCredits * selectedPackage.bonusPercent) / 100),
    package_key: selectedPackage.key,
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
  revalidatePath("/admin");
  revalidatePath("/admin/credits");
}
