"use client";

import { useMemo, useState } from "react";

import {
  CREDIT_PACKAGES,
  getBonusCredits,
  getCreditPackageByKey,
  getTotalCredits,
  type CreditPackageKey,
} from "@/lib/credit-packages";
import type { CreditRequestRow } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function formatCredits(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)} кредит`;
}

function statusStyles(status: CreditRequestRow["status"]) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

function statusLabel(status: CreditRequestRow["status"]) {
  if (status === "approved") {
    return "Зөвшөөрсөн";
  }

  if (status === "rejected") {
    return "Татгалзсан";
  }

  return "Хүлээгдэж буй";
}

function packageLabel(request: CreditRequestRow) {
  if (!request.package_key) {
    return "Хуучин хүсэлт";
  }

  const pkg = getCreditPackageByKey(request.package_key);
  return pkg?.label ?? "Тусгай хүсэлт";
}

export function CreditRequestPanel({
  requests,
  action,
}: {
  requests: CreditRequestRow[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [selectedKey, setSelectedKey] = useState<CreditPackageKey>("growth");

  const selectedPackage = useMemo(
    () => CREDIT_PACKAGES.find((pkg) => pkg.key === selectedKey) ?? CREDIT_PACKAGES[1],
    [selectedKey],
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#090d18] text-white shadow-[0_20px_60px_rgba(2,8,23,0.35)]">
        <div className="border-b border-white/10 px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Кредит нэмэх</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Багцаа сонгоод хүсэлт илгээнэ үү. Админ баталгаажуулсны дараа сонгосон кредит таны дансанд орно.
          </p>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8">
          <div>
            <p className="mb-4 text-sm font-medium text-slate-300">Багц сонгох</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CREDIT_PACKAGES.map((pkg) => {
                const selected = pkg.key === selectedKey;
                const totalCredits = getTotalCredits(pkg);
                const bonusCredits = getBonusCredits(pkg);

                return (
                  <button
                    key={pkg.key}
                    type="button"
                    onClick={() => setSelectedKey(pkg.key)}
                    className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
                      selected
                        ? "border-blue-400 bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_18px_45px_rgba(59,130,246,0.35)]"
                        : "border-white/10 bg-white/[0.08] hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {pkg.badge ? (
                      <span className="absolute right-[-40px] top-4 rotate-45 bg-sky-300 px-10 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                        {pkg.badge}
                      </span>
                    ) : null}

                    <div className="text-xs uppercase tracking-[0.2em] text-white/60">{pkg.label}</div>
                    <div className="mt-4 text-4xl font-semibold">{formatMnt(pkg.priceMnt)}</div>
                    <div className={`mt-4 text-sm ${selected ? "text-white" : "text-slate-200"}`}>
                      {formatCredits(totalCredits)}
                    </div>
                    {bonusCredits > 0 ? (
                      <div className={`mt-1 text-xs ${selected ? "text-blue-50" : "text-sky-300"}`}>
                        +{formatCredits(bonusCredits)} бонус
                      </div>
                    ) : (
                      <div className={`mt-1 text-xs ${selected ? "text-blue-50" : "text-slate-400"}`}>
                        Суурь кредит багц
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium text-slate-300">Сонгосон багц</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Төлбөр</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatMnt(selectedPackage.priceMnt)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Үндсэн кредит</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatCredits(selectedPackage.baseCredits)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Нийт олгох</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatCredits(getTotalCredits(selectedPackage))}
                  </div>
                </div>
              </div>
              {selectedPackage.bonusPercent > 0 ? (
                <p className="mt-4 text-sm text-sky-300">
                  Энэ багцад {selectedPackage.bonusPercent}% бонус орсон.
                </p>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Энэ багц бонусгүй стандарт багц.</p>
              )}
            </div>

            <form action={action} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <input type="hidden" name="package_key" value={selectedKey} />
              <p className="text-sm font-medium text-slate-300">Хүсэлт илгээх</p>
              <p className="mt-2 text-sm text-slate-400">
                Багцаа баталгаажуулаад админд кредит нэмэх хүсэлт илгээнэ үү.
              </p>

              <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Багц</span>
                  <span className="font-medium text-white">{selectedPackage.label}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Төлбөр</span>
                  <span className="font-medium text-white">{formatMnt(selectedPackage.priceMnt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Бонус</span>
                  <span className="font-medium text-white">
                    {selectedPackage.bonusPercent > 0
                      ? `+${formatCredits(getBonusCredits(selectedPackage))}`
                      : "Байхгүй"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="mt-5 w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Кредитийн хүсэлт илгээх
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Хүсэлтийн түүх</h3>
        <p className="mt-1 text-sm text-slate-600">
          Илгээсэн багцын хүсэлтүүд, бонус, төлөвийг эндээс харна.
        </p>

        {requests.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4 font-medium">Багц</th>
                  <th className="py-3 pr-4 font-medium">Төлбөр</th>
                  <th className="py-3 pr-4 font-medium">Олгох кредит</th>
                  <th className="py-3 pr-4 font-medium">Бонус</th>
                  <th className="py-3 pr-4 font-medium">Төлөв</th>
                  <th className="py-3 font-medium">Огноо</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-800">{packageLabel(request)}</td>
                    <td className="py-3 pr-4 text-slate-800">
                      {request.amount_mnt ? formatMnt(request.amount_mnt) : "-"}
                    </td>
                    <td className="py-3 pr-4 text-slate-800">{formatCredits(request.amount)}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {request.bonus_credits > 0 ? formatCredits(request.bonus_credits) : "Байхгүй"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(request.status)}`}
                      >
                        {statusLabel(request.status)}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{formatDate(request.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Одоогоор кредитийн хүсэлт алга.</p>
        )}
      </section>
    </div>
  );
}
