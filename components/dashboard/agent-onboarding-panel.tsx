"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AgentRequestRow, UserRole } from "@/lib/types";

type BankDetails = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

export function AgentOnboardingPanel({
  role,
  request,
  bankDetails,
  priceMnt,
  bonusCredits,
}: {
  role: UserRole;
  request: AgentRequestRow | null;
  bankDetails: BankDetails;
  priceMnt: number;
  bonusCredits: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(request?.payment_screenshot_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setMessage(null);

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(request?.payment_screenshot_url ?? null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError("Шилжүүлгийн хуулганы зураг хавсаргана уу.");
      return;
    }

    setIsPending(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = (await uploadResponse.json()) as Record<string, unknown>;

      if (!uploadResponse.ok) {
        setError(
          typeof uploadPayload.error === "string"
            ? uploadPayload.error
            : "Хуулганы зураг оруулахад алдаа гарлаа.",
        );
        return;
      }

      const submitResponse = await fetch("/api/agent-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_screenshot_url: uploadPayload.url,
        }),
      });
      const submitPayload = (await submitResponse.json()) as Record<string, unknown>;

      if (!submitResponse.ok) {
        setError(
          typeof submitPayload.error === "string"
            ? submitPayload.error
            : "Агент хүсэлт илгээхэд алдаа гарлаа.",
        );
        return;
      }

      setMessage("Төлбөрийн баримт амжилттай илгээгдлээ. Админ шалгасны дараа агент эрх идэвхжинэ.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFile(null);
      router.refresh();
    } catch {
      setError("Санамсаргүй алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  const hasScreenshot = Boolean(request?.payment_screenshot_url);
  const isApproved = role === "agent" || request?.status === "approved";
  const isRejected = request?.status === "rejected";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
        <p className="text-sm text-slate-300">Агент эрхийн баталгаажуулалт</p>
        <h1 className="mt-2 text-3xl font-semibold">Агент хөтөлбөрт элсэх</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Агент эрх идэвхжихийн тулд {formatCurrency(priceMnt)} шилжүүлж, хуулганы
          зургаа хавсаргана уу. Админ зөвшөөрсний дараа `Хичээл` tab нээгдэж,
          {` ${formatCredits(bonusCredits)} `}кредит автоматаар нэмэгдэнэ.
        </p>
      </section>

      {isApproved ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-emerald-900">Агент эрх идэвхжсэн</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Таны агент хүсэлт зөвшөөрөгдсөн. `Хичээл` tab нээгдэж,
            {` ${formatCredits(bonusCredits)} `}кредит дансанд нэмэгдсэн.
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
          {hasScreenshot && !isRejected ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-amber-900">Шалгалт хүлээгдэж байна</h2>
              <p className="mt-2 text-sm text-amber-800">
                Таны шилжүүлгийн баримт илгээгдсэн. Админ шалгасны дараа агент эрх идэвхжинэ.
              </p>
            </section>
          ) : null}

          {isRejected ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-rose-900">Өмнөх хүсэлт татгалзсан</h2>
              <p className="mt-2 text-sm text-rose-800">
                Шинэ төлбөрийн баримт хавсаргаад дахин илгээж болно.
              </p>
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Төлбөрийн заавар</h2>
              <div className="mt-4 rounded-2xl bg-slate-50 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Дүн</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {formatCurrency(priceMnt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Урамшуулал</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-700">
                      {formatCredits(bonusCredits)} кредит
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-slate-500">Банк</span>
                    <span className="font-medium text-slate-900">{bankDetails.bankName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-slate-500">Дансны дугаар</span>
                    <span className="font-medium text-slate-900">{bankDetails.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-slate-500">Хүлээн авагч</span>
                    <span className="font-medium text-slate-900">{bankDetails.accountHolder}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Шилжүүлгийн хуулга илгээх</h2>
              <p className="mt-2 text-sm text-slate-600">
                {formatCurrency(priceMnt)} шилжүүлсний дараа баримтын screenshot-оо хавсаргана уу.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Хуулганы зураг
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-1 block w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  />
                </label>

                {preview ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Шилжүүлгийн хуулга" className="w-full object-cover" />
                  </div>
                ) : null}

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isPending
                    ? "Илгээж байна..."
                    : hasScreenshot
                      ? "Хуулга шинэчилж илгээх"
                      : "Хуулга илгээх"}
                </button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
