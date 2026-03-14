"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CREDIT_PACKAGES,
  getBonusCredits,
  getCreditPackageByKey,
  getTotalCredits,
  type CreditPackageKey,
} from "@/lib/credit-packages";
import { normalizeQPayDeeplinks } from "@/lib/qpay";
import type { CreditRequestRow } from "@/lib/types";

type CreditRequestListItem = CreditRequestRow & {
  created_at_label: string;
  paid_at_label: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function hydrateRequest(request: CreditRequestRow): CreditRequestListItem {
  return {
    ...request,
    qpay_deeplink: normalizeQPayDeeplinks(request.qpay_deeplink),
    created_at_label: formatDate(request.created_at),
    paid_at_label: request.paid_at ? formatDate(request.paid_at) : null,
  };
}

function formatMnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)} MNT`;
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
    return "Амжилттай";
  }

  if (status === "rejected") {
    return "Цуцлагдсан";
  }

  return "Хүлээгдэж буй";
}

function qpayStatusLabel(status: string | null) {
  if (status === "PAID") {
    return "Төлөгдсөн";
  }

  if (status === "FAILED") {
    return "Амжилтгүй";
  }

  if (status === "PARTIAL") {
    return "Дутуу төлөгдсөн";
  }

  if (status === "REFUNDED") {
    return "Буцаагдсан";
  }

  return "Шинэ";
}

function qpayStatusStyles(status: string | null) {
  if (status === "PAID") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return "bg-rose-100 text-rose-800";
  }

  if (status === "PARTIAL") {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-sky-100 text-sky-800";
}

function packageLabel(request: CreditRequestRow) {
  if (!request.package_key) {
    return "Хуучин хүсэлт";
  }

  const pkg = getCreditPackageByKey(request.package_key);
  return pkg?.label ?? "Тусгай хүсэлт";
}

function providerLabel(request: CreditRequestRow) {
  return request.payment_provider === "qpay" ? "QPay" : "Manual";
}

function getInitialActiveRequest(requests: CreditRequestListItem[]) {
  return requests.find((request) => request.payment_provider === "qpay" && request.status === "pending") ?? null;
}

export function CreditRequestPanel({
  requests,
  creditPriceMnt,
}: {
  requests: CreditRequestListItem[];
  creditPriceMnt: number;
}) {
  const initialActiveRequest = getInitialActiveRequest(requests);
  const [selectedKey, setSelectedKey] = useState<CreditPackageKey>("growth");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(initialActiveRequest?.id ?? null);
  const [draftRequest, setDraftRequest] = useState<CreditRequestListItem | null>(initialActiveRequest);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreatingFor, setIsCreatingFor] = useState<CreditPackageKey | null>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const selectedPackage =
    CREDIT_PACKAGES.find((pkg) => pkg.key === selectedKey) ?? CREDIT_PACKAGES[1] ?? CREDIT_PACKAGES[0];
  const activeRequestFromProps = activeRequestId
    ? requests.find((request) => request.id === activeRequestId) ?? null
    : null;
  const activeRequest =
    activeRequestFromProps ?? (draftRequest?.id === activeRequestId ? draftRequest : null);
  const activePackage = activeRequest ? getCreditPackageByKey(activeRequest.package_key ?? "") : selectedPackage;
  const activeCredits = activeRequest
    ? activeRequest.amount
    : getTotalCredits(selectedPackage, creditPriceMnt);
  const activeBonusCredits = activeRequest
    ? activeRequest.bonus_credits
    : getBonusCredits(selectedPackage, creditPriceMnt);
  const activeAmount = activeRequest?.amount_mnt ?? selectedPackage.priceMnt;

  useEffect(() => {
    if (!activeRequestId) {
      const nextRequest = getInitialActiveRequest(requests);

      if (nextRequest) {
        setActiveRequestId(nextRequest.id);
        setDraftRequest(nextRequest);
      }

      return;
    }

    if (activeRequestFromProps) {
      setDraftRequest(activeRequestFromProps);
      return;
    }

    if (draftRequest?.id === activeRequestId) {
      return;
    }

    const fallbackRequest = getInitialActiveRequest(requests);

    if (fallbackRequest) {
      setActiveRequestId(fallbackRequest.id);
      setDraftRequest(fallbackRequest);
    } else {
      setActiveRequestId(null);
      setDraftRequest(null);
    }
  }, [activeRequestId, activeRequestFromProps, draftRequest, requests]);

  function scrollToPayment() {
    requestAnimationFrame(() => {
      paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleCreateInvoice(packageKey: CreditPackageKey) {
    setSelectedKey(packageKey);
    setIsCreatingFor(packageKey);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/qpay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          package_key: packageKey,
        }),
      });
      const payload = (await response.json()) as { error?: string; request?: CreditRequestRow };

      if (!response.ok || !payload.request) {
        setError(payload.error ?? "QPay invoice үүсгэж чадсангүй.");
        return;
      }

      const nextRequest = hydrateRequest(payload.request);
      setActiveRequestId(nextRequest.id);
      setDraftRequest(nextRequest);
      setMessage("QPay invoice бэлэн боллоо. QR эсвэл банкны апп-аар төлбөрөө хийнэ үү.");
      router.refresh();
      scrollToPayment();
    } catch {
      setError("QPay invoice үүсгэх үед алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsCreatingFor(null);
    }
  }

  async function handleCheckPayment() {
    if (!activeRequest) {
      return;
    }

    setIsChecking(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/qpay/check-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: activeRequest.id,
        }),
      });
      const payload = (await response.json()) as {
        approved?: boolean;
        error?: string;
        request?: CreditRequestRow;
      };

      if (!response.ok || !payload.request) {
        setError(payload.error ?? "Төлбөр шалгах үед алдаа гарлаа.");
        return;
      }

      const nextRequest = hydrateRequest(payload.request);
      setActiveRequestId(nextRequest.id);
      setDraftRequest(nextRequest);
      setMessage(
        payload.approved
          ? "Төлбөр баталгаажлаа. Кредит таны дансанд нэмэгдлээ."
          : "Төлбөр хараахан баталгаажаагүй байна. Төлсний дараа дахин шалгана уу.",
      );
      router.refresh();
    } catch {
      setError("Төлбөр шалгах үед алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsChecking(false);
    }
  }

  function openPendingRequest(request: CreditRequestListItem) {
    setActiveRequestId(request.id);
    setDraftRequest(request);
    setError(null);
    setMessage(null);
    scrollToPayment();
  }

  const qrImageSrc =
    activeRequest?.qpay_qr_image ? `data:image/png;base64,${activeRequest.qpay_qr_image}` : null;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#090d18] text-white shadow-[0_20px_60px_rgba(2,8,23,0.35)]">
        <div className="border-b border-white/10 px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Кредит худалдан авах</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Багц сонгоод QPay invoice үүсгэнэ. QR код, QPay short link эсвэл банкны
            deeplink-ээр төлөөд дараа нь төлбөрөө шалгана уу.
          </p>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8">
          <div>
            <p className="mb-4 text-sm font-medium text-slate-300">Багц сонгох</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CREDIT_PACKAGES.map((pkg) => {
                const isSelected = pkg.key === selectedKey;
                const isCreating = isCreatingFor === pkg.key;
                const totalCredits = getTotalCredits(pkg, creditPriceMnt);
                const bonusCredits = getBonusCredits(pkg, creditPriceMnt);

                return (
                  <div
                    key={pkg.key}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition ${
                      isSelected
                        ? "border-blue-400 bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_18px_45px_rgba(59,130,246,0.35)]"
                        : "border-white/10 bg-white/[0.08]"
                    }`}
                  >
                    {pkg.badge ? (
                      <span className="absolute right-[-40px] top-4 rotate-45 bg-sky-300 px-10 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                        {pkg.badge}
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setSelectedKey(pkg.key)}
                      className="w-full text-left"
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-white/60">{pkg.label}</div>
                      <div className="mt-4 text-4xl font-semibold">{formatMnt(pkg.priceMnt)}</div>
                      <div className={`mt-4 text-sm ${isSelected ? "text-white" : "text-slate-200"}`}>
                        {formatCredits(totalCredits)}
                      </div>
                      {bonusCredits > 0 ? (
                        <div className={`mt-1 text-xs ${isSelected ? "text-blue-50" : "text-sky-300"}`}>
                          +{formatCredits(bonusCredits)} бонус
                        </div>
                      ) : (
                        <div className={`mt-1 text-xs ${isSelected ? "text-blue-50" : "text-slate-400"}`}>
                          Суурь кредит багц
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateInvoice(pkg.key)}
                      disabled={isCreating}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreating ? "Үүсгэж байна..." : "QPay invoice үүсгэх"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {activeRequest ? (
            <div ref={paymentRef} className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-300">QPay төлбөр</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">
                      {activePackage?.label ?? packageLabel(activeRequest)} багц
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Invoice № {activeRequest.qpay_sender_invoice_no ?? activeRequest.id}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {formatCredits(activeCredits)}
                    </span>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${qpayStatusStyles(
                          activeRequest.qpay_payment_status,
                        )}`}
                      >
                        {qpayStatusLabel(activeRequest.qpay_payment_status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Төлөх дүн</span>
                    <span className="font-medium text-white">{formatMnt(activeAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Орох кредит</span>
                    <span className="font-medium text-white">{formatCredits(activeCredits)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Бонус</span>
                    <span className="font-medium text-white">
                      {activeBonusCredits > 0 ? formatCredits(activeBonusCredits) : "Байхгүй"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Үүссэн огноо</span>
                    <span className="font-medium text-white">{activeRequest.created_at_label}</span>
                  </div>
                  {activeRequest.paid_at_label ? (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                      <span className="text-emerald-100">Төлөгдсөн огноо</span>
                      <span className="font-medium text-white">{activeRequest.paid_at_label}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {activeRequest.qpay_short_url ? (
                    <a
                      href={activeRequest.qpay_short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      QPay линк нээх
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCheckPayment}
                    disabled={isChecking || activeRequest.status === "approved"}
                    className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isChecking ? "Шалгаж байна..." : "Төлбөр шалгах"}
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                  <p className="text-sm font-medium text-amber-100">Санамж</p>
                  <p className="mt-2 text-sm text-amber-50">
                    QPay callback ирмэгц кредит автоматаар нэмэгдэнэ. Хэрэв UI дээр шууд
                    шинэчлэгдэхгүй бол `Төлбөр шалгах` товчийг дарна уу.
                  </p>
                  <p className="mt-2 text-sm text-amber-50">1 credit = {formatMnt(creditPriceMnt)}</p>
                </div>

                {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
                {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <p className="text-sm font-medium text-slate-300">Төлбөрийн QR</p>
                <p className="mt-2 text-sm text-slate-400">
                  QR кодоо уншуулж эсвэл доорх банкны апп-аар нээж төлнө үү.
                </p>

                {qrImageSrc ? (
                  <div className="mt-5 overflow-hidden rounded-[2rem] bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrImageSrc} alt="QPay QR" className="w-full rounded-[1.5rem]" />
                  </div>
                ) : (
                  <div className="mt-5 rounded-[2rem] border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-400">
                    QR мэдээлэл ирээгүй байна.
                  </div>
                )}

                {activeRequest.qpay_deeplink?.length ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {activeRequest.qpay_deeplink.map((item) => (
                      <a
                        key={`${item.name}-${item.link}`}
                        href={item.link}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-white/20 hover:bg-black/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.logo}
                          alt={item.description}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{item.description}</div>
                          <div className="truncate text-xs text-slate-400">{item.name}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] px-5 py-6 text-sm text-slate-400">
              Багцын `QPay invoice үүсгэх` товч дээр дарж төлбөрийн хэсгийг нээнэ үү.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Хүсэлтийн түүх</h3>
        <p className="mt-1 text-sm text-slate-600">
          QPay invoice, төлбөрийн төлөв, кредитийн хүсэлтийн явцыг эндээс харна.
        </p>

        {requests.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4 font-medium">Багц</th>
                  <th className="py-3 pr-4 font-medium">Төлбөр</th>
                  <th className="py-3 pr-4 font-medium">Кредит</th>
                  <th className="py-3 pr-4 font-medium">Provider</th>
                  <th className="py-3 pr-4 font-medium">QPay төлөв</th>
                  <th className="py-3 pr-4 font-medium">Систем төлөв</th>
                  <th className="py-3 pr-4 font-medium">Огноо</th>
                  <th className="py-3 font-medium">Үйлдэл</th>
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
                    <td className="py-3 pr-4 text-slate-700">{providerLabel(request)}</td>
                    <td className="py-3 pr-4">
                      {request.payment_provider === "qpay" ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${qpayStatusStyles(
                            request.qpay_payment_status,
                          )}`}
                        >
                          {qpayStatusLabel(request.qpay_payment_status)}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(request.status)}`}
                      >
                        {statusLabel(request.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{request.created_at_label}</td>
                    <td className="py-3 text-slate-600">
                      {request.payment_provider === "qpay" && request.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => openPendingRequest(request)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Үргэлжлүүлэх
                        </button>
                      ) : request.payment_screenshot_url ? (
                        <a
                          href={request.payment_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-cyan-700 hover:text-cyan-600"
                        >
                          Баримт үзэх
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
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
