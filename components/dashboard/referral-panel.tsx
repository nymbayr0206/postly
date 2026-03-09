"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReferralSummaryRow } from "@/lib/types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

function buildInvitePath(referralCode: string) {
  return `/auth?ref=${encodeURIComponent(referralCode)}`;
}

export function ReferralPanel({
  referralCode,
  summary,
}: {
  referralCode: string;
  summary: ReferralSummaryRow;
}) {
  const [copied, setCopied] = useState(false);

  const invitePath = useMemo(() => buildInvitePath(referralCode), [referralCode]);

  async function handleCopy() {
    const inviteLink =
      typeof window === "undefined" ? invitePath : `${window.location.origin}${invitePath}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="brand-surface rounded-[1.75rem] p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="text-sm font-semibold text-cyan-700">Урилгын систем</div>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Өөрийн урилгын линкээ хуваалцаарай</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Энэ линкээр бүртгүүлсэн энгийн хэрэглэгчийн баталгаажсан кредит цэнэглэлт бүрээс та
            10% кредитийн урамшуулал авна. Хэрэв агент агент уриад 150,000₮-ийн төлбөр нь
            баталгаажвал урьсан агент 30%-ийн урамшуулал авна.
          </p>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Таны урилгын код
            </div>
            <div className="mt-2 text-2xl font-black tracking-[0.16em] text-slate-950">
              {referralCode}
            </div>

            <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <div className="truncate">{invitePath}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                {copied ? "Линк хуулагдлаа" : "Линк хуулах"}
              </button>
              <Link
                href={invitePath}
                target="_blank"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Урилгын хуудсыг нээх
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Бүртгүүлсэн хүн</div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {formatNumber(summary.invited_users)}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Урамшуулал өгсөн баталгаа</div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {formatNumber(summary.approved_topups)}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-cyan-700">Олсон урамшууллын кредит</div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {formatNumber(summary.earned_credits)}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
