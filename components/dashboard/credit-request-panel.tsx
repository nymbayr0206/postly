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

function getInitialSelectedKey(requests: CreditRequestListItem[]) {
  const pendingRequest = getInitialActiveRequest(requests);
  const pendingPackage = pendingRequest?.package_key
    ? getCreditPackageByKey(pendingRequest.package_key)
    : null;

  return pendingPackage?.key ?? "growth";
}

export function CreditRequestPanel({
  requests,
  creditPriceMnt,
}: {
  requests: CreditRequestListItem[];
  creditPriceMnt: number;
}) {
  const initialActiveRequest = getInitialActiveRequest(requests);
  const [selectedKey, setSelectedKey] = useState<CreditPackageKey>(() => getInitialSelectedKey(requests));
  const [activeRequestId, setActiveRequestId] = useState<string | null>(initialActiveRequest?.id ?? null);
  const [draftRequest, setDraftRequest] = useState<CreditRequestListItem | null>(initialActiveRequest);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreatingFor, setIsCreatingFor] = useState<CreditPackageKey | null>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const createNonceRef = useRef(0);
  const router = useRouter();

  const selectedPackage =
    CREDIT_PACKAGES.find((pkg) => pkg.key === selectedKey) ?? CREDIT_PACKAGES[1] ?? CREDIT_PACKAGES[0];
  const activeRequestFromProps = activeRequestId
    ? requests.find((request) => request.id === activeRequestId) ?? null
    : null;
  const activeRequest =
    activeRequestFromProps ?? (draftRequest?.id === activeRequestId ? draftRequest : null);
  const visibleRequest =
    activeRequest && activeRequest.package_key === selectedKey ? activeRequest : null;
  const activePackage = visibleRequest
    ? getCreditPackageByKey(visibleRequest.package_key ?? "") ?? selectedPackage
    : selectedPackage;
  const activeCredits = visibleRequest ? visibleRequest.amount : getTotalCredits(selectedPackage, creditPriceMnt);
  const activeBonusCredits = visibleRequest
    ? visibleRequest.bonus_credits
    : getBonusCredits(selectedPackage, creditPriceMnt);
  const activeAmount = visibleRequest?.amount_mnt ?? selectedPackage.priceMnt;
  const qrImageSrc =
    visibleRequest?.qpay_qr_image ? `data:image/png;base64,${visibleRequest.qpay_qr_image}` : null;
  const selectedIsCreating = isCreatingFor === selectedKey;

  useEffect(() => {
    if (!activeRequestId) {
      return;
    }

    if (activeRequestFromProps) {
      setDraftRequest(activeRequestFromProps);
      return;
    }

    if (draftRequest?.id === activeRequestId) {
      return;
    }

    setActiveRequestId(null);
    setDraftRequest(null);
  }, [activeRequestId, activeRequestFromProps, draftRequest]);

  function scrollToPayment() {
    requestAnimationFrame(() => {
      paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function findPendingRequestForPackage(packageKey: CreditPackageKey) {
    if (
      draftRequest &&
      draftRequest.payment_provider === "qpay" &&
      draftRequest.status === "pending" &&
      draftRequest.package_key === packageKey
    ) {
      return draftRequest;
    }

    return (
      requests.find(
        (request) =>
          request.payment_provider === "qpay" &&
          request.status === "pending" &&
          request.package_key === packageKey,
      ) ?? null
    );
  }

  async function createInvoiceForPackage(packageKey: CreditPackageKey) {
    const nonce = ++createNonceRef.current;

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
        if (createNonceRef.current === nonce) {
          setError(payload.error ?? "QPay invoice үүсгэж чадсангүй.");
        }
        return;
      }

      if (createNonceRef.current !== nonce) {
        return;
      }

      const nextRequest = hydrateRequest(payload.request);
      setSelectedKey(packageKey);
      setActiveRequestId(nextRequest.id);
      setDraftRequest(nextRequest);
      setMessage("QPay invoice бэлэн боллоо. QR болон deeplink-үүд доор гарлаа.");
      router.refresh();
      scrollToPayment();
    } catch {
      if (createNonceRef.current === nonce) {
        setError("QPay invoice үүсгэх үед алдаа гарлаа. Дахин оролдоно уу.");
      }
    } finally {
      if (createNonceRef.current === nonce) {
        setIsCreatingFor(null);
      }
    }
  }

  async function handleSelectPackage(packageKey: CreditPackageKey) {
    if (isCreatingFor && isCreatingFor !== packageKey) {
      return;
    }

    setSelectedKey(packageKey);
    setError(null);
    setMessage(null);

    const matchingRequest = findPendingRequestForPackage(packageKey);

    if (matchingRequest) {
      setActiveRequestId(matchingRequest.id);
      setDraftRequest(matchingRequest);
      scrollToPayment();
      return;
    }

    setActiveRequestId(null);
    setDraftRequest(null);
    scrollToPayment();
    await createInvoiceForPackage(packageKey);
  }

  async function handleCheckPayment() {
    if (!visibleRequest) {
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
          request_id: visibleRequest.id,
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
    const requestPackage = request.package_key ? getCreditPackageByKey(request.package_key) : null;

    if (requestPackage) {
      setSelectedKey(requestPackage.key);
    }

    setActiveRequestId(request.id);
    setDraftRequest(request);
    setError(null);
    setMessage(null);
    scrollToPayment();
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#090d18] text-white shadow-[0_20px_60px_rgba(2,8,23,0.35)]">
        <div className="border-b border-white/10 px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Кредит худалдан авах</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Багц дээр дармагц QPay invoice шууд үүснэ. QR болон банкны deeplink-үүд доор
            автоматаар харагдана.
          </p>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8">
          <div>
            <p className="mb-4 text-sm font-medium text-slate-300">Багц сонгох</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CREDIT_PACKAGES.map((pkg) => {
                const isSelected = pkg.key === selectedKey;
                const totalCredits = getTotalCredits(pkg, creditPriceMnt);
                const bonusCredits = getBonusCredits(pkg, creditPriceMnt);

                return (
                  <button
                    key={pkg.key}
                    type="button"
                    onClick={() => {
                      void handleSelectPackage(pkg.key);
                    }}
                    className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
                      isSelected
                        ? "border-blue-400 bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_18px_45px_rgba(59,130,246,0.35)]"
                        : "border-white/10 bg-white/[0.08] hover:border-white/20 hover:bg-white/[0.12]"
                    }`}
                  >
                    {pkg.badge ? (
                      <span className="absolute right-[-40px] top-4 rotate-45 bg-sky-300 px-10 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                        {pkg.badge}
                      </span>
                    ) : null}

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

                    <div className="mt-5 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/90">
                      {isSelected && selectedIsCreating
                        ? "Бэлдэж байна..."
                        : isSelected
                          ? "Сонгогдсон"
                          : "Сонгох"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={paymentRef} className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    {visibleRequest
                      ? "QPay төлбөр"
                      : selectedIsCreating
                        ? "Invoice бэлдэж байна"
                        : "Төлбөрийн хэсэг"}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{activePackage.label} багц</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {visibleRequest
                      ? `Invoice № ${visibleRequest.qpay_sender_invoice_no ?? visibleRequest.id}`
                      : selectedIsCreating
                        ? "QPay invoice, QR болон deeplink-үүдийг бэлдэж байна."
                        : "Багц сонгоход энэ хэсэг автоматаар QPay төлбөрийн мэдээлэл рүү шилжинэ."}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    {formatCredits(activeCredits)}
                  </span>
                  {visibleRequest ? (
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${qpayStatusStyles(
                          visibleRequest.qpay_payment_status,
                        )}`}
                      >
                        {qpayStatusLabel(visibleRequest.qpay_payment_status)}
                      </span>
                    </div>
                  ) : null}
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
                {visibleRequest ? (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-slate-400">Үүссэн огноо</span>
                    <span className="font-medium text-white">{visibleRequest.created_at_label}</span>
                  </div>
                ) : null}
                {visibleRequest?.paid_at_label ? (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                    <span className="text-emerald-100">Төлөгдсөн огноо</span>
                    <span className="font-medium text-white">{visibleRequest.paid_at_label}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {visibleRequest?.qpay_short_url ? (
                  <a
                    href={visibleRequest.qpay_short_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    QPay линк нээх
                  </a>
                ) : null}

                {visibleRequest ? (
                  <button
                    type="button"
                    onClick={handleCheckPayment}
                    disabled={isChecking || visibleRequest.status === "approved"}
                    className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isChecking ? "Шалгаж байна..." : "Төлбөр шалгах"}
                  </button>
                ) : null}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="text-sm font-medium text-amber-100">Санамж</p>
                <p className="mt-2 text-sm text-amber-50">
                  {visibleRequest
                    ? "QPay callback ирмэгц кредит автоматаар нэмэгдэнэ. Хэрэв шинэчлэгдэхгүй бол Төлбөр шалгах товчийг дарна уу."
                    : selectedIsCreating
                      ? "QPay-с QR болон банкны deeplink-үүдийг татаж байна."
                      : "Багц сонгоход invoice шууд үүсэж, баруун талд төлбөрийн хэрэгслүүд гарч ирнэ."}
                </p>
                <p className="mt-2 text-sm text-amber-50">1 credit = {formatMnt(creditPriceMnt)}</p>
              </div>

              {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
              {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-sm font-medium text-slate-300">
                {visibleRequest
                  ? "Төлбөрийн QR"
                  : selectedIsCreating
                    ? "QPay бэлдэж байна"
                    : "QR болон банкны апп"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {visibleRequest
                  ? "QR кодоо уншуулж эсвэл доорх банкны апп-аар нээж төлнө үү."
                  : selectedIsCreating
                    ? "QPay-с QR болон deeplink-үүдийг авч байна."
                    : "Багц сонгоход QPay QR болон банкны deeplink энд автоматаар харагдана."}
              </p>

              {qrImageSrc ? (
                <div className="mt-5 overflow-hidden rounded-[2rem] bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImageSrc} alt="QPay QR" className="w-full rounded-[1.5rem]" />
                </div>
              ) : (
                <div className="mt-5 rounded-[2rem] border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-400">
                  {selectedIsCreating
                    ? "QPay invoice бэлдэж байна..."
                    : "Сонгосон багцын QR болон bank deeplink энд гарч ирнэ."}
                </div>
              )}

              {visibleRequest?.qpay_deeplink?.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {visibleRequest.qpay_deeplink.map((item) => (
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
