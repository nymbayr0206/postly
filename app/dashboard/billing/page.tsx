import { redirect } from "next/navigation";

import { CreditRequestPanel } from "@/components/dashboard/credit-request-panel";
import { formatCredits } from "@/lib/generation-pricing";
import { PAYMENT_REVIEW_MINUTES, getAdminBankDetails } from "@/lib/payment-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreditRequestRow } from "@/lib/types";
import { ensureUserRecords, getPlatformSettings, getWallet } from "@/lib/user-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);

  const [wallet, platformSettings, creditRequestResponse] = await Promise.all([
    getWallet(supabase, user.id),
    getPlatformSettings(supabase),
    supabase
      .from("credit_requests")
      .select("id,user_id,amount,amount_mnt,bonus_credits,package_key,payment_screenshot_url,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (creditRequestResponse.error) {
    throw new Error(creditRequestResponse.error.message);
  }

  const requests = ((creditRequestResponse.data ?? []) as CreditRequestRow[]).map((request) => ({
    ...request,
    created_at_label: formatDate(request.created_at),
  }));
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCredits = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + request.amount, 0);
  const approvedRevenue = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + (request.amount_mnt ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-300">Одоогийн кредит</p>
            <p className="mt-2 text-4xl font-semibold">{formatCredits(wallet.credits)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Хүлээгдэж буй хүсэлт</p>
            <p className="mt-2 text-4xl font-semibold">{pendingCount}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Зөвшөөрөгдсөн кредит</p>
            <p className="mt-2 text-4xl font-semibold">{formatCredits(approvedCredits)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Зөвшөөрөгдсөн дүн</p>
            <p className="mt-2 text-4xl font-semibold">
              {new Intl.NumberFormat("mn-MN").format(approvedRevenue)}₮
            </p>
          </div>
        </div>
      </section>

      <CreditRequestPanel
        requests={requests}
        bankDetails={getAdminBankDetails()}
        creditPriceMnt={platformSettings.credit_price_mnt}
        reviewMinutes={PAYMENT_REVIEW_MINUTES}
      />
    </div>
  );
}
