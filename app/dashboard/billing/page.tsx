import { redirect } from "next/navigation";

import { createCreditRequestAction } from "@/app/dashboard/actions";
import { CreditRequestPanel } from "@/components/dashboard/credit-request-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreditRequestRow } from "@/lib/types";
import { ensureUserRecords, getWallet } from "@/lib/user-data";

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);

  const [wallet, creditRequestResponse] = await Promise.all([
    getWallet(supabase, user.id),
    supabase
      .from("credit_requests")
      .select("id,user_id,amount,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (creditRequestResponse.error) {
    throw new Error(creditRequestResponse.error.message);
  }

  const requests = (creditRequestResponse.data ?? []) as CreditRequestRow[];
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedTotal = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + request.amount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-300">Одоогийн кредит</p>
            <p className="mt-2 text-4xl font-semibold">{wallet.credits}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Хүлээгдэж буй хүсэлт</p>
            <p className="mt-2 text-4xl font-semibold">{pendingCount}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Зөвшөөрөгдсөн кредит</p>
            <p className="mt-2 text-4xl font-semibold">{approvedTotal}</p>
          </div>
        </div>
      </section>

      <CreditRequestPanel requests={requests} action={createCreditRequestAction} />
    </div>
  );
}
