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

type ActionMode = "convert" | "payout";
type ActivityFilter = "all" | "rewarded" | "pending";

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

function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.35rem] border p-4 shadow-sm ${
        accent ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          accent ? "text-cyan-700" : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </article>
  );
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
  const [actionMode, setActionMode] = useState<ActionMode>("convert");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
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
  const quickAmounts = useMemo(() => {
    const values = [10000, 30000, summary.available_amount_mnt];
    const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
    return unique.sort((a, b) => a - b);
  }, [summary.available_amount_mnt]);
  const filteredActivity = useMemo(() => {
    if (activityFilter === "rewarded") {
      return activity.filter((item) => item.earned_amount_mnt > 0);
    }

    if (activityFilter === "pending") {
      return activity.filter((item) => item.earned_amount_mnt <= 0);
    }

    return activity;
  }, [activity, activityFilter]);

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

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Postly урилгын линк",
          text: "Миний урилгын линкээр Postly-д бүртгүүлээрэй.",
          url: inviteLink,
        });
        return;
      } catch {
        // Fall through to copy for cancelled or unsupported share flows.
      }
    }

    await handleCopy();
  }

  function applyQuickAmount(value: number) {
    const normalized = String(value);

    if (actionMode === "convert") {
      setConvertAmountMnt(normalized);
      return;
    }

    setPayoutAmountMnt(normalized);
  }

  return (
    <section className="brand-surface rounded-[1.75rem] p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-cyan-700">Урилгын систем</div>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Урьсан хүмүүс, орлого, reward-ээ нэг дороос удирд</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Линкээ хуваалцах, хэдэн хүн бүртгүүлснийг харах, хэнээс хэдэн төгрөг орж ирснийг шалгах, мөн reward-аа
            кредит эсвэл мөнгөн таталт болгох урсгалыг энд илүү ойлгомжтой болгож нэгтгэлээ.
          </p>
        </div>
        <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Боломжит үлдэгдэл: {formatMnt(summary.available_amount_mnt)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Бүртгүүлсэн хүн" value={formatNumber(summary.invited_users)} />
        <MetricCard label="Reward event" value={formatNumber(summary.reward_events)} />
        <MetricCard label="Нийт олсон" value={formatMnt(summary.earned_amount_mnt)} />
        <MetricCard label="Одоо ашиглах боломжтой" value={formatMnt(summary.available_amount_mnt)} accent />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Таны урилгын код</div>
                <div className="mt-2 break-all text-2xl font-black tracking-[0.16em] text-slate-950">{referralCode}</div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Энгийн хэрэглэгчийн баталгаажсан цэнэглэлт бүрээс 10% мөнгөн reward, агент approve болбол 30,000₮ reward орно.
                </p>
              </div>

              <div className="rounded-[1.15rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                Хуваалцсан линкээр бүртгүүлсэн хүн бүр энд автоматаар тоологдоно.
              </div>
            </div>

            <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="truncate">{inviteLink}</div>
            </div>

            {copyError ? <div className="mt-3 text-sm text-rose-600">{copyError}</div> : null}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                {copied ? "Линк хуулагдлаа" : "Линк хуулах"}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Хуваалцах
              </button>
              <Link
                href={inviteLink}
                target="_blank"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Урилгын хуудсыг нээх
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="text-sm font-semibold text-slate-900">Яаж ажилладаг вэ</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">1-р алхам</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">Линкээ түгээнэ</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">Таны кодтой линкээр хэрэглэгч бүртгүүлнэ.</p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">2-р алхам</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">Reward үүснэ</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Төлбөр баталгаажих бүрт мөнгөн reward автоматаар бүртгэгдэнэ.
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">3-р алхам</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">Ашиглана</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Reward-аа кредит болгох эсвэл данс руу мөнгө татах хүсэлт илгээнэ.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Reward ашиглах</div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Нэг удаад нэг үйлдэл дээр төвлөрч, дүнгээ хурдан сонгож ашиглахаар хийлээ.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Боломжит үлдэгдэл</div>
              <div className="mt-1 text-2xl font-black text-slate-950">{formatMnt(summary.available_amount_mnt)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-[1.2rem] bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setActionMode("convert")}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                actionMode === "convert" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Кредит болгох
            </button>
            <button
              type="button"
              onClick={() => setActionMode("payout")}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                actionMode === "payout" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Мөнгө татах
            </button>
          </div>

          {quickAmounts.length > 0 ? (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Түгээмэл дүн</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => applyQuickAmount(amount)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    {amount === summary.available_amount_mnt ? "Бүгдийг" : formatMnt(amount)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {actionMode === "convert" ? (
            <form action={convertAction} className="mt-4 space-y-4">
              <div>
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

              <div className="rounded-[1rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                Одоогийн ханшаар {formatNumber(estimatedCredits)} кредит нэмэгдэнэ. 1 credit ={" "}
                {formatMnt(effectiveCreditPriceMnt)}.
              </div>

              {convertState.error ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {convertState.error}
                </div>
              ) : null}

              {convertState.success ? (
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {convertState.success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isConverting || summary.available_amount_mnt <= 0}
                className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConverting ? "Хөрвүүлж байна..." : "Кредит болгох"}
              </button>
            </form>
          ) : (
            <form action={payoutAction} className="mt-4 space-y-3">
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

              {payoutState.error ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {payoutState.error}
                </div>
              ) : null}

              {payoutState.success ? (
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {payoutState.success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isRequestingPayout || summary.available_amount_mnt <= 0}
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequestingPayout ? "Илгээж байна..." : "Мөнгө татах хүсэлт илгээх"}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Урьсан хэрэглэгчдийн жагсаалт</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Яг хэнийг урьсан, тухайн хүнээс хэдэн төгрөгийн reward орсон, хэдэн удаа event үүссэнийг эндээс хурдан харна.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              { value: "all", label: "Бүгд" },
              { value: "rewarded", label: "Reward орсон" },
              { value: "pending", label: "Хүлээгдэж буй" },
            ] as Array<{ value: ActivityFilter; label: string }>).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActivityFilter(option.value)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  activityFilter === option.value
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <div className="mt-4 rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Сонгосон шүүлтүүр дээр харагдах хэрэглэгч алга байна.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 xl:hidden">
              {filteredActivity.map((item) => (
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
                        {roleLabel(item.referred_user_role)} · Бүртгүүлсэн: {formatDate(item.joined_at)}
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
                        Орж ирсэн мөнгө
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-950">{formatMnt(item.earned_amount_mnt)}</div>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Reward event
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-950">{formatNumber(item.reward_events)}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">Сүүлийн reward: {formatDate(item.last_reward_at)}</div>
                </article>
              ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[900px] text-left text-sm">
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
                  {filteredActivity.map((item) => (
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
