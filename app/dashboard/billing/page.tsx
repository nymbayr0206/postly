import { redirect } from "next/navigation";

import { CreditRequestPanel } from "@/components/dashboard/credit-request-panel";
import { CREDIT_REQUEST_SELECT } from "@/lib/credit-requests";
import { formatCredits } from "@/lib/generation-pricing";
import { resolveQPayDeeplinks } from "@/lib/qpay";
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
      .select(CREDIT_REQUEST_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<CreditRequestRow[]>(),
  ]);

  if (creditRequestResponse.error) {
    throw new Error(creditRequestResponse.error.message);
  }

  const requests = await Promise.all(
    (creditRequestResponse.data ?? []).map(async (request) => ({
      ...request,
      qpay_deeplink:
        request.payment_provider === "qpay"
          ? await resolveQPayDeeplinks(request.qpay_deeplink, request.qpay_short_url)
          : request.qpay_deeplink,
      created_at_label: formatDate(request.created_at),
      paid_at_label: request.paid_at ? formatDate(request.paid_at) : null,
    })),
  );
  const approvedRequests = requests.filter((request) => request.status === "approved");
  const approvedCount = approvedRequests.length;
  const approvedCredits = approvedRequests.reduce((sum, request) => sum + request.amount, 0);
  const approvedRevenue = approvedRequests.reduce((sum, request) => sum + (request.amount_mnt ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-300">Одоогийн кредит</p>
            <p className="mt-2 text-4xl font-semibold">{formatCredits(wallet.credits)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Амжилттай худалдан авалт</p>
            <p className="mt-2 text-4xl font-semibold">{approvedCount}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Худалдан авсан кредит</p>
            <p className="mt-2 text-4xl font-semibold">{formatCredits(approvedCredits)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Нийт төлсөн дүн</p>
            <p className="mt-2 text-4xl font-semibold">
              {new Intl.NumberFormat("mn-MN").format(approvedRevenue)}₮
            </p>
          </div>
        </div>
      </section>

      <CreditRequestPanel
        requests={requests}
        creditPriceMnt={platformSettings.credit_price_mnt}
      />
    </div>
  );
}
