"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { normalizeQPayDeeplinks } from "@/lib/qpay";
import type { AgentRequestRow, QPayDeeplink, UserRole } from "@/lib/types";

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export function AgentOnboardingPanel({
  role,
  request,
  priceMnt,
  bonusCredits,
}: {
  role: UserRole;
  request: AgentRequestRow | null;
  priceMnt: number;
  bonusCredits: number;
}) {
  const [currentRequest, setCurrentRequest] = useState<AgentRequestRow | null>(request);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resolvedDeeplinks, setResolvedDeeplinks] = useState<QPayDeeplink[]>([]);
  const [isLoadingDeeplinks, setIsLoadingDeeplinks] = useState(false);
  const router = useRouter();

  const isApproved = role === "agent" || currentRequest?.status === "approved";
  const isRejected = currentRequest?.status === "rejected";
  const isPendingQPay =
    currentRequest?.status === "pending" &&
    currentRequest.payment_provider === "qpay" &&
    Boolean(currentRequest.qpay_invoice_id);
  const requestDeeplinks = normalizeQPayDeeplinks(currentRequest?.qpay_deeplink);
  const visibleDeeplinks = requestDeeplinks.length > 0 ? requestDeeplinks : resolvedDeeplinks;
  const qrImageSrc = currentRequest?.qpay_qr_image
    ? `data:image/png;base64,${currentRequest.qpay_qr_image}`
    : null;

  useEffect(() => {
    setCurrentRequest(request);
  }, [request]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    void Promise.allSettled(
      ["/api/agent-request/create-invoice", "/api/agent-request/check-payment", "/api/qpay/deeplinks"].map((url) =>
        fetch(url, {
          method: "HEAD",
          cache: "no-store",
        }),
      ),
    );
  }, []);

  useEffect(() => {
    if (
      !currentRequest ||
      currentRequest.payment_provider !== "qpay" ||
      currentRequest.status !== "pending" ||
      !currentRequest.qpay_short_url ||
      requestDeeplinks.length > 0 ||
      resolvedDeeplinks.length > 0
    ) {
      return;
    }

    let cancelled = false;
    setIsLoadingDeeplinks(true);

    void (async () => {
      try {
        const response = await fetch("/api/qpay/deeplinks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            short_url: currentRequest.qpay_short_url,
          }),
        });
        const payload = (await response.json()) as {
          deeplinks?: QPayDeeplink[];
        };

        if (cancelled || !response.ok) {
          return;
        }

        setResolvedDeeplinks(Array.isArray(payload.deeplinks) ? payload.deeplinks : []);
      } finally {
        if (!cancelled) {
          setIsLoadingDeeplinks(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentRequest, requestDeeplinks.length, resolvedDeeplinks.length]);

  async function handleCreateInvoice() {
    setError(null);
    setMessage(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/agent-request/create-invoice", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        request?: AgentRequestRow;
      };

      if (!response.ok || !payload.request) {
        setError(payload.error ?? "Agent QPay invoice үүсгэж чадсангүй.");
        return;
      }

      setResolvedDeeplinks([]);
      setCurrentRequest(payload.request);
      setMessage("QPay invoice бэлэн боллоо. QR болон банкны апп-ууд доор гарлаа.");
    } catch {
      setError("QPay invoice үүсгэх үед алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCheckPayment() {
    if (!currentRequest) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsChecking(true);

    try {
      const response = await fetch("/api/agent-request/check-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: currentRequest.id,
        }),
      });
      const payload = (await response.json()) as {
        approved?: boolean;
        error?: string;
        request?: AgentRequestRow;
      };

      if (!response.ok || !payload.request) {
        setError(payload.error ?? "Төлбөр шалгах үед алдаа гарлаа.");
        return;
      }

      setCurrentRequest(payload.request);
      setMessage(
        payload.approved
          ? "QPay төлбөр баталгаажлаа. Агент эрх автоматаар идэвхжлээ."
          : "Төлбөр хараахан баталгаажаагүй байна. Төлсний дараа дахин шалгана уу.",
      );

      if (payload.approved) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setError("Төлбөр шалгах үед алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
        <p className="text-sm text-slate-300">Агент эрхийн баталгаажуулалт</p>
        <h1 className="mt-2 text-3xl font-semibold">Агент хөтөлбөрт элсэх</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          Агент эрх идэвхжихийн тулд QPay-аар {formatCurrency(priceMnt)} төлнө. Төлбөр батлагдмагц агент эрх
          автоматаар идэвхжиж, {formatCredits(bonusCredits)} кредит дансанд нэмэгдэнэ.
        </p>
      </section>

      {isApproved ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-emerald-900">Агент эрх идэвхжсэн</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Төлбөр баталгаажсан. `Хичээл` tab нээгдэж, {formatCredits(bonusCredits)} кредит дансанд орсон.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/lessons"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Хичээл рүү орох
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Dashboard руу буцах
            </Link>
          </div>
        </section>
      ) : (
        <>
          {isPendingQPay ? (
            <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-sky-900">QPay invoice бэлэн</h2>
              <p className="mt-2 text-sm text-sky-800">
                QR эсвэл банкны апп-аар төлөөд `Төлбөр шалгах` товчоор баталгаажуулна уу. Callback ирвэл агент эрх
                автоматаар идэвхжинэ.
              </p>
            </section>
          ) : null}

          {isRejected ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-rose-900">Өмнөх хүсэлт татгалзсан</h2>
              <p className="mt-2 text-sm text-rose-800">
                Доорх товчоор шинэ QPay invoice үүсгээд дахин оролдож болно.
              </p>
            </section>
          ) : null}

          {currentRequest?.payment_provider === "manual" && currentRequest.status === "pending" ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-amber-900">Хуучин manual хүсэлт байна</h2>
              <p className="mt-2 text-sm text-amber-800">
                Одоо QPay ашиглан шууд төлөх боломжтой. Шинэ invoice үүсгэвэл энэ хүсэлт QPay урсгал руу шинэчлэгдэнэ.
              </p>
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Агент багц</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Нэг удаагийн элсэлтийн төлбөр. Төлбөр батлагдмагц agent tariff болон кредит автоматаар орно.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatCredits(bonusCredits)} кредит
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Төлөх дүн</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(priceMnt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Орох кредит</span>
                  <span className="font-semibold text-slate-950">{formatCredits(bonusCredits)} кредит</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Төлбөрийн төрөл</span>
                  <span className="font-semibold text-slate-950">QPay</span>
                </div>
                {currentRequest ? (
                  <>
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-slate-500">Invoice</span>
                      <span className="font-semibold text-slate-950">
                        {currentRequest.qpay_sender_invoice_no ?? currentRequest.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-slate-500">QPay төлөв</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${qpayStatusStyles(
                          currentRequest.qpay_payment_status,
                        )}`}
                      >
                        {qpayStatusLabel(currentRequest.qpay_payment_status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-slate-500">Үүсгэсэн огноо</span>
                      <span className="font-semibold text-slate-950">{formatDate(currentRequest.created_at)}</span>
                    </div>
                    {currentRequest.paid_at ? (
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <span className="text-emerald-700">Төлөгдсөн огноо</span>
                        <span className="font-semibold text-emerald-900">{formatDate(currentRequest.paid_at)}</span>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCreateInvoice}
                  disabled={isCreating}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isCreating
                    ? "Invoice бэлдэж байна..."
                    : isPendingQPay
                      ? "QPay invoice сэргээх"
                      : "QPay invoice үүсгэх"}
                </button>

                {isPendingQPay ? (
                  <button
                    type="button"
                    onClick={handleCheckPayment}
                    disabled={isChecking}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isChecking ? "Шалгаж байна..." : "Төлбөр шалгах"}
                  </button>
                ) : null}
              </div>

              <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-medium text-sky-900">Санамж</p>
                <p className="mt-2 text-sm text-sky-800">
                  Агент onboarding дээр screenshot илгээх шаардлагагүй. QPay callback ирмэгц эсвэл `Төлбөр шалгах`
                  дармагц агент эрх автоматаар идэвхжинэ.
                </p>
              </div>

              {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
              {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Төлбөрийн хэрэгслүүд</h2>
              <p className="mt-2 text-sm text-slate-600">
                QR кодоор төлөх эсвэл утсан дээрээ доорх банкны апп-аар шууд нээнэ үү.
              </p>

              {isLoadingDeeplinks ? (
                <div className="mt-5 grid grid-cols-3 gap-3 min-[420px]:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="aspect-square rounded-2xl bg-slate-200" />
                      <div className="mt-2 h-4 rounded-full bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : visibleDeeplinks.length ? (
                <div className="mt-5 grid grid-cols-3 gap-3 min-[420px]:grid-cols-4">
                  {visibleDeeplinks.map((item) => (
                    <a
                      key={`${item.name}-${item.link}`}
                      href={item.link}
                      className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex aspect-square w-full max-w-[76px] items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.logo} alt={item.description} className="h-full w-full rounded-xl object-contain" />
                      </div>
                      <div className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-slate-700 sm:text-xs">
                        {item.description}
                      </div>
                    </a>
                  ))}
                </div>
              ) : currentRequest && qrImageSrc ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Энэ invoice дээр банкны аппын жагсаалт хараахан бэлэн болоогүй байна. QR кодоор төлбөрөө үргэлжлүүлж болно.
                </div>
              ) : null}

              <div className="mt-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">QR код</div>
                {qrImageSrc ? (
                  <div className="overflow-hidden rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <a
                      href={currentRequest?.qpay_short_url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImageSrc} alt="QPay QR" className="w-full rounded-[1.5rem]" />
                    </a>
                  </div>
                ) : (
                  <div className="rounded-[2rem] border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                    QPay invoice үүсмэгц QR код энд гарч ирнэ.
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
