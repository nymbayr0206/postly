"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export async function createCreditRequestAction(formData: FormData) {
  const amountValue = Number(formData.get("amount"));

  if (!Number.isInteger(amountValue) || amountValue <= 0) {
    throw new Error("Дүн нь 0-ээс их бүхэл тоо байх ёстой.");
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
    amount: amountValue,
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

