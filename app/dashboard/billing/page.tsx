import Link from "next/link";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

import { BillingValueBanner } from "@/components/dashboard/billing-value-banner";

import { CREDIT_REQUEST_SELECT } from "@/lib/credit-requests";
import { formatCredits } from "@/lib/generation-pricing";
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

const CreditRequestPanel = dynamic(
  () => import("@/components/dashboard/credit-request-panel").then((module) => module.CreditRequestPanel),
  {
    loading: () => <BillingPanelSkeleton />,
  },
);

const ReferralPanel = dynamic(
  () => import("@/components/dashboard/referral-panel").then((module) => module.ReferralPanel),
  {
    loading: () => <BillingPanelSkeleton />,
  },
);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function BillingPanelSkeleton() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div className="h-7 w-56 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      </div>
    </section>
  );
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

    requests = (creditRequestResponse.data ?? []).map((request) => ({
        ...request,
        created_at_label: formatDate(request.created_at),
        paid_at_label: request.paid_at ? formatDate(request.paid_at) : null,
      }));

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
              <p className="text-sm text-slate-300">Үлдэгдэл</p>
              <p className="mt-2 text-4xl font-semibold">
                {new Intl.NumberFormat("mn-MN").format(wallet.credits * platformSettings.credit_price_mnt)}₮
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Амжилттай худалдан авалт</p>
              <p className="mt-2 text-4xl font-semibold">{approvedCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Нийт зарцуулсан</p>
              <p className="mt-2 text-4xl font-semibold">
                {new Intl.NumberFormat("mn-MN").format(approvedCredits * platformSettings.credit_price_mnt)}₮
              </p>
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
              <p className="text-sm text-slate-300">Үлдэгдэл</p>
              <p className="mt-2 text-4xl font-semibold">
                {new Intl.NumberFormat("mn-MN").format(wallet.credits * platformSettings.credit_price_mnt)}₮
              </p>
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
              Төлбөр
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
              ? "Төлбөр хийх, QPay болон худалдан авалтын түүхээ эндээс удирдана."
              : "Урилгын линк, reward болон referral орлогоо эндээс удирдана."}
          </p>
        </section>
      ) : null}

      {activeTab === "credit" ? <BillingValueBanner /> : null}

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
