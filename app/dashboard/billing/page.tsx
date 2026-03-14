import Link from "next/link";
import { redirect } from "next/navigation";

import { CreditRequestPanel } from "@/components/dashboard/credit-request-panel";
import { ReferralPanel } from "@/components/dashboard/referral-panel";
import { CREDIT_REQUEST_SELECT } from "@/lib/credit-requests";
import { formatCredits } from "@/lib/generation-pricing";
import { resolveQPayDeeplinks } from "@/lib/qpay";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreditRequestRow, ReferralActivityRow, ReferralSummaryRow } from "@/lib/types";
import {
  ensureUserRecords,
  getPlatformSettings,
  getReferralActivity,
  getReferralSummary,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";

type BillingTab = "credit" | "referral";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);
  const requestedTab = resolvedSearchParams?.tab === "referral" ? "referral" : "credit";

  const [profile, wallet, platformSettings] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getPlatformSettings(supabase),
  ]);

  const hasReferral = Boolean(profile.referral_code);
  const activeTab: BillingTab = hasReferral ? requestedTab : "credit";
  let requests: Array<
    CreditRequestRow & {
      created_at_label: string;
      paid_at_label: string | null;
    }
  > = [];
  let approvedCount = 0;
  let approvedCredits = 0;
  let approvedRevenue = 0;
  let referralSummary: ReferralSummaryRow | null = null;
  let referralActivity: ReferralActivityRow[] | null = null;

  if (activeTab === "credit") {
    const creditRequestResponse = await supabase
      .from("credit_requests")
      .select(CREDIT_REQUEST_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<CreditRequestRow[]>();

    if (creditRequestResponse.error) {
      throw new Error(creditRequestResponse.error.message);
    }

    requests = await Promise.all(
      (creditRequestResponse.data ?? []).map(async (request) => ({
        ...request,
        qpay_deeplink:
          request.payment_provider === "qpay" && request.status === "pending"
            ? await resolveQPayDeeplinks(request.qpay_deeplink, request.qpay_short_url)
            : request.qpay_deeplink,
        created_at_label: formatDate(request.created_at),
        paid_at_label: request.paid_at ? formatDate(request.paid_at) : null,
      })),
    );

    const approvedRequests = requests.filter((request) => request.status === "approved");
    approvedCount = approvedRequests.length;
    approvedCredits = approvedRequests.reduce((sum, request) => sum + request.amount, 0);
    approvedRevenue = approvedRequests.reduce((sum, request) => sum + (request.amount_mnt ?? 0), 0);
  }

  if (hasReferral && activeTab === "referral") {
    [referralSummary, referralActivity] = await Promise.all([
      getReferralSummary(supabase, user.id),
      getReferralActivity(supabase, user.id),
    ]);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {activeTab === "credit" ? (
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
      ) : referralSummary ? (
        <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-slate-300">Одоогийн кредит</p>
              <p className="mt-2 text-4xl font-semibold">{formatCredits(wallet.credits)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Урьсан хүн</p>
              <p className="mt-2 text-4xl font-semibold">{referralSummary.invited_users}</p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Нийт reward</p>
              <p className="mt-2 text-4xl font-semibold">
                {new Intl.NumberFormat("mn-MN").format(referralSummary.earned_amount_mnt)}₮
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Ашиглах боломжтой</p>
              <p className="mt-2 text-4xl font-semibold">
                {new Intl.NumberFormat("mn-MN").format(referralSummary.available_amount_mnt)}₮
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {hasReferral ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-slate-100 p-1.5 sm:inline-grid sm:min-w-[24rem]">
            <Link
              href="/dashboard/billing?tab=credit"
              aria-current={activeTab === "credit" ? "page" : undefined}
              className={`inline-flex items-center justify-center rounded-[1rem] px-4 py-3 text-center text-sm font-semibold transition ${
                activeTab === "credit"
                  ? "bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] !text-slate-950 shadow-[0_14px_30px_rgba(47,188,230,0.22)]"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
            >
              Кредит
            </Link>
            <Link
              href="/dashboard/billing?tab=referral"
              aria-current={activeTab === "referral" ? "page" : undefined}
              className={`inline-flex items-center justify-center rounded-[1rem] px-4 py-3 text-center text-sm font-semibold transition ${
                activeTab === "referral"
                  ? "bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] !text-slate-950 shadow-[0_14px_30px_rgba(47,188,230,0.22)]"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
            >
              Урилга
            </Link>
          </div>
          <p className="mt-3 px-1 text-sm text-slate-500">
            {activeTab === "credit"
              ? "Кредит цэнэглэх, QPay төлбөр болон худалдан авалтын түүхээ эндээс удирдана."
              : "Урилгын линк, reward болон referral орлогоо эндээс удирдана."}
          </p>
        </section>
      ) : null}

      {activeTab === "credit" ? (
        <CreditRequestPanel
          requests={requests}
          creditPriceMnt={platformSettings.credit_price_mnt}
        />
      ) : null}

      {hasReferral && activeTab === "referral" && referralSummary && referralActivity ? (
        <ReferralPanel
          referralCode={profile.referral_code ?? ""}
          summary={referralSummary}
          activity={referralActivity}
          creditPriceMnt={platformSettings.credit_price_mnt}
        />
      ) : null}
    </div>
  );
}
