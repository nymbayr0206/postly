"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CREDIT_PACKAGES,
  getBonusCredits,
  getCreditPackageByKey,
  getTotalCredits,
  type CreditPackageKey,
} from "@/lib/credit-packages";
import type { CreditRequestRow } from "@/lib/types";

type BankDetails = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

type CreditRequestListItem = CreditRequestRow & {
  created_at_label: string;
};

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
  bankDetails,
  creditPriceMnt,
  reviewMinutes,
}: {
  requests: CreditRequestListItem[];
  bankDetails: BankDetails;
  creditPriceMnt: number;
  reviewMinutes: number;
}) {
  const [selectedKey, setSelectedKey] = useState<CreditPackageKey>("growth");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const paymentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const selectedPackage = useMemo(
    () => CREDIT_PACKAGES.find((pkg) => pkg.key === selectedKey) ?? CREDIT_PACKAGES[1],
    [selectedKey],
  );
  const selectedTotalCredits = getTotalCredits(selectedPackage, creditPriceMnt);
  const selectedBonusCredits = getBonusCredits(selectedPackage, creditPriceMnt);

  function openPayment(packageKey: CreditPackageKey) {
    setSelectedKey(packageKey);
    setPaymentOpen(true);
    setError(null);
    setMessage(null);

    requestAnimationFrame(() => {
      paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setMessage(null);

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError("Шилжүүлгийн screenshot-оо хавсаргана уу.");
      return;
    }

    setIsPending(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        body: uploadFormData,
      });
      const uploadPayload = (await uploadResponse.json()) as Record<string, unknown>;

      if (!uploadResponse.ok) {
        setError(
          typeof uploadPayload.error === "string"
            ? uploadPayload.error
            : "Screenshot байршуулахад алдаа гарлаа.",
        );
        return;
      }

      const requestResponse = await fetch("/api/credit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_key: selectedPackage.key,
          payment_screenshot_url: uploadPayload.url,
        }),
      });
      const requestPayload = (await requestResponse.json()) as Record<string, unknown>;

      if (!requestResponse.ok) {
        setError(
          typeof requestPayload.error === "string"
            ? requestPayload.error
            : "Кредитийн хүсэлт илгээхэд алдаа гарлаа.",
        );
        return;
      }

      setMessage("Төлбөрийн баримт амжилттай илгээгдлээ. Админ шалгаад кредитийг тань цэнэглэнэ.");
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch {
      setError("Санамсаргүй алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#090d18] text-white shadow-[0_20px_60px_rgba(2,8,23,0.35)]">
        <div className="border-b border-white/10 px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Кредит худалдаж авах</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Багцаа сонгоод `Худалдаж авах` дээр дарна уу. Төлбөрийн хэсэгт шилжиж,
            шилжүүлгийн screenshot-оо хавсаргасны дараа хүсэлт илгээгдэнэ.
          </p>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8">
          <div>
            <p className="mb-4 text-sm font-medium text-slate-300">Багц сонгох</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CREDIT_PACKAGES.map((pkg) => {
                const selected = paymentOpen && pkg.key === selectedKey;
                const totalCredits = getTotalCredits(pkg, creditPriceMnt);
                const bonusCredits = getBonusCredits(pkg, creditPriceMnt);

                return (
                  <button
                    key={pkg.key}
                    type="button"
                    onClick={() => openPayment(pkg.key)}
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

                    <div className="mt-5 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white">
                      Худалдаж авах
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {paymentOpen ? (
            <div ref={paymentRef} className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Төлбөрийн хэсэг</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">{selectedPackage.label} багц</h3>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    {formatCredits(selectedTotalCredits)}
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Дансны дугаар</span>
                    <span className="font-medium text-white">{bankDetails.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Банкны нэр</span>
                    <span className="font-medium text-white">{bankDetails.bankName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Хүлээн авагч</span>
                    <span className="font-medium text-white">{bankDetails.accountHolder}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3">
                    <span className="text-cyan-100">Шилжүүлэх дүн</span>
                    <span className="text-lg font-semibold text-white">
                      {formatMnt(selectedPackage.priceMnt)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                  <p className="text-sm font-medium text-amber-100">Санамж</p>
                  <p className="mt-2 text-sm text-amber-50">
                    Админ {reviewMinutes} минутын дотор таны кредитийг цэнэглэнэ.
                    Шилжүүлгийн screenshot тод, бүтэн харагдаж байх шаардлагатай.
                  </p>
                  <p className="mt-2 text-sm text-amber-50">1 credit = {formatMnt(creditPriceMnt)}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <p className="text-sm font-medium text-slate-300">Баримт хавсаргах</p>
                <p className="mt-2 text-sm text-slate-400">
                  Шилжүүлгээ хийсний дараа screenshot-оо оруулаад хүсэлтээ илгээнэ үү.
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
                    <span className="text-slate-400">Олгох кредит</span>
                    <span className="font-medium text-white">
                      {formatCredits(selectedTotalCredits)}
                    </span>
                  </div>
                  {selectedBonusCredits > 0 ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400">Bonus</span>
                      <span className="font-medium text-white">{formatCredits(selectedBonusCredits)}</span>
                    </div>
                  ) : null}
                </div>

                <label className="mt-5 block text-sm font-medium text-slate-200">
                  Шилжүүлгийн screenshot
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-2 block w-full cursor-pointer rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                  />
                </label>

                {preview ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Шилжүүлгийн screenshot" className="w-full object-cover" />
                  </div>
                ) : null}

                {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
                {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-5 w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isPending ? "Илгээж байна..." : "Хүсэлт илгээх"}
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] px-5 py-6 text-sm text-slate-400">
              Багцын `Худалдаж авах` товч дээр дарж төлбөрийн хэсгийг нээнэ үү.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Хүсэлтийн түүх</h3>
        <p className="mt-1 text-sm text-slate-600">
          Илгээсэн багц, төлбөр, screenshot, төлөвийг эндээс харна.
        </p>

        {requests.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4 font-medium">Багц</th>
                  <th className="py-3 pr-4 font-medium">Төлбөр</th>
                  <th className="py-3 pr-4 font-medium">Олгох кредит</th>
                  <th className="py-3 pr-4 font-medium">Баримт</th>
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
                      {request.payment_screenshot_url ? (
                        <a
                          href={request.payment_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-cyan-700 hover:text-cyan-600"
                        >
                          Үзэх
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(request.status)}`}
                      >
                        {statusLabel(request.status)}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{request.created_at_label}</td>
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
