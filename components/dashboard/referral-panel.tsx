"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  createReferralPayoutRequestAction,
  type ReferralActionState,
  convertReferralRewardToCreditsAction,
} from "@/app/dashboard/actions";
import { DEFAULT_CREDIT_PRICE_MNT } from "@/lib/credit-packages";
import type { ReferralActivityRow, ReferralSummaryRow } from "@/lib/types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

function formatMnt(value: number) {
  return `${formatNumber(value)}₮`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Одоогоор reward ороогүй";
  }

  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleLabel(role: ReferralActivityRow["referred_user_role"]) {
  if (role === "agent") {
    return "Агент";
  }

  if (role === "admin") {
    return "Админ";
  }

  return "Хэрэглэгч";
}

function buildInvitePath(referralCode: string) {
  return `/auth?ref=${encodeURIComponent(referralCode)}`;
}

function normalizeSiteUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function buildInviteLink(invitePath: string) {
  const configuredSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredSiteUrl) {
    return new URL(invitePath, configuredSiteUrl).toString();
  }

  if (typeof window !== "undefined") {
    return new URL(invitePath, window.location.origin).toString();
  }

  return invitePath;
}

function fallbackCopyText(text: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

const EMPTY_ACTION_STATE: ReferralActionState = {};

export function ReferralPanel({
  referralCode,
  summary,
  activity,
  creditPriceMnt,
}: {
  referralCode: string;
  summary: ReferralSummaryRow;
  activity: ReferralActivityRow[];
  creditPriceMnt: number;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [convertAmountMnt, setConvertAmountMnt] = useState(String(summary.available_amount_mnt || ""));
  const [payoutAmountMnt, setPayoutAmountMnt] = useState(String(summary.available_amount_mnt || ""));
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [convertState, convertAction, isConverting] = useActionState(
    convertReferralRewardToCreditsAction,
    EMPTY_ACTION_STATE,
  );
  const [payoutState, payoutAction, isRequestingPayout] = useActionState(
    createReferralPayoutRequestAction,
    EMPTY_ACTION_STATE,
  );

  const invitePath = useMemo(() => buildInvitePath(referralCode), [referralCode]);
  const inviteLink = useMemo(() => buildInviteLink(invitePath), [invitePath]);
  const effectiveCreditPriceMnt = useMemo(
    () =>
      Number.isFinite(creditPriceMnt) && creditPriceMnt > 0
        ? Math.floor(creditPriceMnt)
        : DEFAULT_CREDIT_PRICE_MNT,
    [creditPriceMnt],
  );
  const estimatedCredits = useMemo(() => {
    const amount = Number(convertAmountMnt);

    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    return Math.floor(amount / effectiveCreditPriceMnt);
  }, [convertAmountMnt, effectiveCreditPriceMnt]);

  async function handleCopy() {
    try {
      if (typeof navigator !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else if (!fallbackCopyText(inviteLink)) {
        throw new Error("copy_failed");
      }

      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError("Линк автоматаар хуулагдсангүй. HTTPS асаах эсвэл доорх линкийг гараар хуулна уу.");
    }
  }

  return (
    <section className="brand-surface rounded-[1.75rem] p-5 sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-cyan-700">Урилгын систем</div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Өөрийн урилгын линкээ хуваалцаарай</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Энэ линкээр бүртгүүлсэн энгийн хэрэглэгчийн баталгаажсан кредит цэнэглэлт бүрээс 10%-ийн мөнгөн
              урамшуулал авна. Хэрэв агентын урилгын линкээр шинэ агент бүртгүүлж 150,000₮-ийн төлбөр нь
              баталгаажвал урьсан агентын урамшуулалд шууд 30,000₮ нэмэгдэнэ.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Таны урилгын код</div>
            <div className="mt-2 text-2xl font-black tracking-[0.16em] text-slate-950">{referralCode}</div>

            <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <div className="truncate">{inviteLink}</div>
            </div>

            {copyError ? <div className="mt-3 text-sm text-rose-600">{copyError}</div> : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                {copied ? "Линк хуулагдлаа" : "Линк хуулах"}
              </button>
              <Link
                href={inviteLink}
                target="_blank"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Урилгын хуудсыг нээх
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <form action={convertAction} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Урамшууллаа кредит болгох</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Урамшууллын мөнгөө тухайн платформын credit үнээр кредит болгож болно. Одоо 1 credit =
                {" "}
                {formatMnt(effectiveCreditPriceMnt)} бөгөөд 10,000₮ хөрвүүлбэл{" "}
                {formatNumber(Math.floor(10000 / effectiveCreditPriceMnt))} кредит нэмэгдэнэ.
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Хөрвүүлэх дүн
                </label>
                <input
                  type="number"
                  name="amount_mnt"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={convertAmountMnt}
                  onChange={(event) => setConvertAmountMnt(event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  placeholder="Жишээ: 30000"
                />
              </div>

              <div className="mt-3 rounded-[1rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                Шууд {formatNumber(estimatedCredits)} кредит нэмэгдэнэ.
              </div>

              {convertState.error ? (
                <div className="mt-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {convertState.error}
                </div>
              ) : null}

              {convertState.success ? (
                <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {convertState.success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isConverting || summary.available_amount_mnt <= 0}
                className="mt-4 w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConverting ? "Хөрвүүлж байна..." : "Кредит болгох"}
              </button>
            </form>

            <form action={payoutAction} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Данс руу мөнгө татах</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Урамшууллын мөнгөө банкны данс руу татах хүсэлтээр илгээнэ. Админ баталгаажуулсны дараа
                шилжүүлнэ.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="number"
                  name="amount_mnt"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={payoutAmountMnt}
                  onChange={(event) => setPayoutAmountMnt(event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  placeholder="Татан авах дүн"
                />
                <input
                  type="text"
                  name="bank_name"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  placeholder="Банкны нэр"
                />
                <input
                  type="text"
                  name="account_holder"
                  value={accountHolder}
                  onChange={(event) => setAccountHolder(event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  placeholder="Данс эзэмшигчийн нэр"
                />
                <input
                  type="text"
                  name="account_number"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  placeholder="Дансны дугаар"
                />
              </div>

              {payoutState.error ? (
                <div className="mt-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {payoutState.error}
                </div>
              ) : null}

              {payoutState.success ? (
                <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {payoutState.success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isRequestingPayout || summary.available_amount_mnt <= 0}
                className="mt-4 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequestingPayout ? "Илгээж байна..." : "Мөнгө татах хүсэлт илгээх"}
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Бүртгүүлсэн хүн</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{formatNumber(summary.invited_users)}</div>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Reward event</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{formatNumber(summary.reward_events)}</div>
          </article>

          <article className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-cyan-700">Боломжит урамшууллын мөнгө</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{formatMnt(summary.available_amount_mnt)}</div>
          </article>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <article className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Нийт олсон</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{formatMnt(summary.earned_amount_mnt)}</div>
            </article>
            <article className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Кредит болгосон</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{formatMnt(summary.converted_amount_mnt)}</div>
            </article>
            <article className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Хүлээгдэж буй таталт</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{formatMnt(summary.pending_payout_amount_mnt)}</div>
            </article>
            <article className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 sm:col-span-3 xl:col-span-1">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Данс руу шилжүүлсэн</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{formatMnt(summary.paid_out_amount_mnt)}</div>
            </article>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Урьсан хэрэглэгчдийн жагсаалт</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Энд яг хэнийг урьсан, тухайн хэрэглэгчээс хэдэн төгрөгийн reward орсон, хэдэн удаа event үүссэнийг харуулна.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Нийт {formatNumber(activity.length)} хүн
          </div>
        </div>

        {activity.length === 0 ? (
          <div className="mt-4 rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Одоогоор урилгын линкээр бүртгүүлсэн хэрэглэгч алга байна.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 lg:hidden">
              {activity.map((item) => (
                <article
                  key={item.referred_user_id}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-950">
                        {item.referred_user_email || item.referred_user_id}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {roleLabel(item.referred_user_role)} · {formatDate(item.joined_at)}
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.earned_amount_mnt > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.earned_amount_mnt > 0 ? "Reward орсон" : "Хүлээгдэж байна"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Нийт орлого
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-950">
                        {formatMnt(item.earned_amount_mnt)}
                      </div>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Reward event
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-950">
                        {formatNumber(item.reward_events)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Сүүлийн reward: {formatDate(item.last_reward_at)}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-medium">Хэрэглэгч</th>
                    <th className="px-3 py-3 font-medium">Төрөл</th>
                    <th className="px-3 py-3 font-medium">Бүртгүүлсэн</th>
                    <th className="px-3 py-3 font-medium">Reward event</th>
                    <th className="px-3 py-3 font-medium">Орж ирсэн мөнгө</th>
                    <th className="px-3 py-3 font-medium">Сүүлийн reward</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((item) => (
                    <tr key={item.referred_user_id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-4 font-medium text-slate-900">
                        <div className="max-w-[260px] truncate">{item.referred_user_email || item.referred_user_id}</div>
                      </td>
                      <td className="px-3 py-4 text-slate-600">{roleLabel(item.referred_user_role)}</td>
                      <td className="px-3 py-4 text-slate-600">{formatDate(item.joined_at)}</td>
                      <td className="px-3 py-4 text-slate-900">{formatNumber(item.reward_events)}</td>
                      <td className="px-3 py-4 font-semibold text-slate-950">{formatMnt(item.earned_amount_mnt)}</td>
                      <td className="px-3 py-4 text-slate-600">{formatDate(item.last_reward_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
