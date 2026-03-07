"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { GenerationPricingCard } from "@/components/dashboard/generation-pricing-card";
import type { GenerationPricingPreview, ImageAspectRatio } from "@/lib/types";

type GenerateResult = {
  image_url: string;
  cost: number;
  credits_remaining: number;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Ð—ÑƒÑ€Ð³Ð¸Ð¹Ð³ ÑƒÐ½ÑˆÐ¸Ð¶ Ñ‡Ð°Ð´ÑÐ°Ð½Ð³Ò¯Ð¹."));
    };
    reader.onerror = () => reject(new Error("Ð—ÑƒÑ€Ð³Ð¸Ð¹Ð³ ÑƒÐ½ÑˆÐ¸Ð¶ Ñ‡Ð°Ð´ÑÐ°Ð½Ð³Ò¯Ð¹."));
    reader.readAsDataURL(file);
  });
}

const ASPECT_RATIOS: Array<{ value: ImageAspectRatio; label: string; detail: string }> = [
  { value: "1:1", label: "1:1", detail: "Feed, Ð±Ò¯Ñ‚ÑÑÐ³Ð´ÑÑ…Ò¯Ò¯Ð½" },
  { value: "4:5", label: "4:5", detail: "Instagram Ð¿Ð¾ÑÑ‚" },
  { value: "16:9", label: "16:9", detail: "Cover, website" },
];

const PROMPT_HINTS = [
  "Ó©Ð½Ð³Ó©, Ð³ÑÑ€ÑÐ»Ñ‚Ò¯Ò¯Ð»ÑÐ³, ÐºÐ°Ð¼ÐµÑ€Ñ‹Ð½ Ó©Ð½Ñ†Ð³Ð¸Ð¹Ð³ Ñ‚Ð¾Ð´Ð¾Ñ€Ñ…Ð¾Ð¹ Ð±Ð¸Ñ‡Ð¸Ñ…",
  "Ð±Ñ€ÑÐ½Ð´Ð¸Ð¹Ð½ Ð¼ÑÐ´Ñ€ÑÐ¼Ð¶, Ð¾Ñ€Ñ‡Ð½Ñ‹ ÑƒÑƒÑ€ Ð°Ð¼ÑŒÑÐ³Ð°Ð»Ñ‹Ð³ Ð¾Ñ€ÑƒÑƒÐ»Ð°Ñ…",
  "Ð»Ð°Ð²Ð»Ð°Ñ… Ð·ÑƒÑ€Ð°Ð³ Ð°ÑˆÐ¸Ð³Ð»Ð°Ð²Ð°Ð» Ð¸Ð»Ò¯Ò¯ Ñ‚Ð¾Ð³Ñ‚Ð²Ð¾Ñ€Ñ‚Ð¾Ð¹ Ð³Ð°Ñ€Ð½Ð°",
];

export function ImageGeneratorClient({
  currentCredits,
  pricing,
}: {
  currentCredits: number;
  pricing: GenerationPricingPreview;
}) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("1:1");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function resetReferences() {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewsRef.current = [];
    setFiles([]);
    setPreviews([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));

    if (incoming.length === 0) {
      return;
    }

    const remainingSlots = Math.max(0, 3 - files.length);
    const accepted = incoming.slice(0, remainingSlots);

    if (accepted.length === 0) {
      setError("Ð¥Ð°Ð¼Ð³Ð¸Ð¹Ð½ Ð¸Ñ…Ð´ÑÑ 3 Ð»Ð°Ð²Ð»Ð°Ñ… Ð·ÑƒÑ€Ð°Ð³ Ð¾Ñ€ÑƒÑƒÐ»Ð½Ð°.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setError(null);
    setFiles((prev) => [...prev, ...accepted]);
    setPreviews((prev) => [...prev, ...accepted.map((file) => URL.createObjectURL(file))]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    const removedPreview = previews[index];

    if (removedPreview) {
      URL.revokeObjectURL(removedPreview);
    }

    setFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setPreviews((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const availableCredits = result ? result.credits_remaining : currentCredits;

    if (!prompt.trim()) {
      setError("ÐŸÑ€Ð¾Ð¼Ð¿Ñ‚ Ñ…Ð¾Ð¾ÑÐ¾Ð½ Ð±Ð°Ð¹Ð½Ð°.");
      return;
    }


    if (availableCredits < pricing.current_cost) {
      setError(`Кредит хүрэлцэхгүй байна. ${pricing.current_cost} кредит шаардлагатай.`);
      return;
    }

    setIsPending(true);

    try {
      const referenceImages = await Promise.all(files.map((file) => fileToDataUrl(file)));
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          reference_images: referenceImages,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "ÐÐ»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°.");
        return;
      }

      setResult(payload as GenerateResult);
      setPrompt("");
      resetReferences();
      router.refresh();
    } catch {
      setError("ÐÐ»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°. Ð”Ð°Ñ…Ð¸Ð½ Ð¾Ñ€Ð¾Ð»Ð´Ð¾Ð½Ð¾ ÑƒÑƒ.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setPrompt("");
    resetReferences();
    setResult(null);
    setError(null);
  }

  const creditsRemaining = result ? result.credits_remaining : currentCredits;
  const hasEnoughCredits = creditsRemaining >= pricing.current_cost;

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-0 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <div className="border-b border-[rgba(14,42,66,0.08)] bg-white/70 lg:border-b-0 lg:border-r">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="space-y-5 p-4 sm:p-6">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,248,252,0.92))] p-5 shadow-[0_20px_45px_rgba(9,38,66,0.06)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-950">Ð—ÑƒÑ€Ð°Ð³ Ò¯Ò¯ÑÐ³ÑÑ…</h1>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">
                      ÐœÐ¾Ð±Ð°Ð¹Ð» Ð´ÑÑÑ€ Ñ…ÑƒÑ€Ð´Ð°Ð½ Ð°ÑˆÐ¸Ð³Ð»Ð°Ñ…Ð°Ð´ Ð·Ð¾Ñ€Ð¸ÑƒÐ»Ð°Ð³Ð´ÑÐ°Ð½ ÑÐ½Ð³Ð¸Ð¹Ð½ ÑƒÑ€ÑÐ³Ð°Ð». ÐŸÑ€Ð¾Ð¼Ð¿Ñ‚, Ñ…Ð°Ñ€ÑŒÑ†Ð°Ð°,
                      Ð»Ð°Ð²Ð»Ð°Ñ… Ð·ÑƒÑ€Ð³Ð°Ð° ÑÐ¾Ð½Ð³Ð¾Ð¾Ð´ ÑˆÑƒÑƒÐ´ Ò¯Ò¯ÑÐ³ÑÐ½Ñ.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ò®Ð»Ð´ÑÐ³Ð´ÑÐ» ÐºÑ€ÐµÐ´Ð¸Ñ‚</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{creditsRemaining}</p>
                </div>
              </div>
            </div>

            <GenerationPricingCard pricing={pricing} />

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">ÐŸÑ€Ð¾Ð¼Ð¿Ñ‚</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Ð¯Ð³ ÑÐ¼Ð°Ñ€ Ð´Ò¯Ñ€ÑÐ»ÑÐ» Ñ…Ò¯ÑÑÐ¶ Ð±Ð°Ð¹Ð³Ð°Ð°Ð³Ð°Ð° Ñ‚Ð¾Ð´Ð¾Ñ€Ñ…Ð¾Ð¹ Ð±Ð¸Ñ‡Ð½Ñ Ò¯Ò¯.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {prompt.trim().length} Ñ‚ÑÐ¼Ð´ÑÐ³Ñ‚
                </span>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ð–Ð¸ÑˆÑÑ: ÐœÐ¸Ð½Ð¸Ð¼Ð°Ð» ÑÑ‚ÑƒÐ´Ð¸Ð´ Ð±Ð°Ð¹Ñ€Ð»Ð°ÑÐ°Ð½ Ð±Ò¯Ñ‚ÑÑÐ³Ð´ÑÑ…Ò¯Ò¯Ð½, Ð·Ó©Ó©Ð»Ó©Ð½ cyan Ð³ÑÑ€ÑÐ»Ñ‚ÑÐ¹, cinematic product shot, clean background..."
                rows={6}
                className="mt-4 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {PROMPT_HINTS.map((hint) => (
                  <div
                    key={hint}
                    className="rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600"
                  >
                    {hint}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Ð›Ð°Ð²Ð»Ð°Ñ… Ð·ÑƒÑ€Ð°Ð³</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Ð¥Ò¯ÑÐ²ÑÐ» 3 Ñ…Ò¯Ñ€Ñ‚ÑÐ» Ð·ÑƒÑ€Ð°Ð³ Ñ…Ð°Ð²ÑÐ°Ñ€Ð³Ð°Ð¶ Ð±Ð¾Ð»Ð½Ð¾.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {files.length}/3
                </span>
              </div>

              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {previews.map((src, index) => (
                    <div key={src} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="aspect-square h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/80 text-sm text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Ã—
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= 3}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-cyan-300 bg-cyan-50/70 px-4 py-4 text-sm font-medium text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                Ð—ÑƒÑ€Ð°Ð³ Ð½ÑÐ¼ÑÑ…
              </button>
            </section>

            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setSettingsOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
              >
                ÐÑÐ¼ÑÐ»Ñ‚ Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾
                <svg
                  className={`h-4 w-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            <section className={`${settingsOpen ? "block" : "hidden lg:block"} rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5`}>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Ð¥Ð°Ñ€ÑŒÑ†Ð°Ð°</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Ð¥ÑÑ€ÑÐ³Ð»ÑÑ… ÑÑƒÐ²Ð³Ð°Ð°ÑÐ°Ð° Ñ…Ð°Ð¼Ð°Ð°Ñ€Ñ‡ Ñ…Ð°Ñ€ÑŒÑ†Ð°Ð°Ð³Ð°Ð° ÑÐ¾Ð½Ð³Ð¾Ð½Ð¾ ÑƒÑƒ.</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                      aspectRatio === ratio.value
                        ? "border-cyan-400 bg-cyan-50 text-cyan-900 shadow-[0_16px_32px_rgba(18,159,213,0.16)]"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-200 hover:bg-white"
                    }`}
                  >
                    <p className="text-base font-semibold">{ratio.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{ratio.detail}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-auto border-t border-[rgba(14,42,66,0.08)] bg-white/90 p-4 sm:p-6">
            {error && (
              <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isPending || !hasEnoughCredits}
                className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,#31c4e8,#129fd5)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(18,159,213,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ð—ÑƒÑ€Ð°Ð³ Ð±Ð¾Ð»Ð¾Ð²ÑÑ€ÑƒÑƒÐ»Ð¶ Ð±Ð°Ð¹Ð½Ð°...
                  </>
                ) : (
                  `Ð—ÑƒÑ€Ð°Ð³ Ò¯Ò¯ÑÐ³ÑÑ… Â· ${pricing.current_cost} ÐºÑ€`
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Ð¦ÑÐ²ÑÑ€Ð»ÑÑ…
              </button>
            </div>
            {!hasEnoughCredits ? (
              <p className="mt-3 text-sm text-amber-700">
                Энэ үүсгэлтийг эхлүүлэхийн тулд доод хаяж {pricing.current_cost} кредит шаардлагатай.
              </p>
            ) : null}
          </div>
        </form>
      </div>

      <div className="bg-[radial-gradient(circle_at_top_right,rgba(132,224,239,0.24),transparent_28%),linear-gradient(180deg,rgba(247,252,255,0.72),rgba(239,248,251,0.95))] p-4 sm:p-6 lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] p-6 text-white sm:p-7">
            <div className="relative z-10 flex h-full flex-col justify-between gap-6">
              <div>
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                  Ð¨ÑƒÑƒÐ´ Ò¯Ñ€ Ð´Ò¯Ð½
                </span>
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">ÐŸÐ¾ÑÑ‚Ð»Ð¸ Ó©Ð½Ð³Ó© Ð°ÑÑÑ‚Ð°Ð¹, Ñ†ÑÐ²ÑÑ€ preview</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                  Ð“Ð°Ñ€ÑÐ°Ð½ Ð·ÑƒÑ€Ð°Ð³ ÑÑ…Ð»ÑÑÐ´ ÑÐ½Ð´ Ñ…Ð°Ñ€Ð°Ð³Ð´Ð°Ð½Ð°. ÐœÐ¾Ð±Ð°Ð¹Ð» Ð´ÑÑÑ€ download Ñ‚Ð¾Ð²Ñ‡ Ò¯Ñ€Ð³ÑÐ»Ð¶ Ð¸Ð» Ð³Ð°Ñ€Ñ‡, Ð½ÑÐ³ Ð³Ð°Ñ€Ð°Ð°Ñ€ Ð°ÑˆÐ¸Ð³Ð»Ð°Ñ…Ð°Ð´ Ñ…ÑÐ»Ð±Ð°Ñ€ Ð±Ð°Ð¹Ð½Ð°.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Ð¥Ð°Ñ€ÑŒÑ†Ð°Ð°</p>
                  <p className="mt-2 text-lg font-semibold">{aspectRatio}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Ð›Ð°Ð²Ð»Ð°Ñ… Ð·ÑƒÑ€Ð°Ð³</p>
                  <p className="mt-2 text-lg font-semibold">{files.length}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Ð¤Ð¾Ñ€Ð¼Ð°Ñ‚</p>
                  <p className="mt-2 text-lg font-semibold">PNG</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ð¥ÑƒÑ€Ð´Ð°Ð½ checklist</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>1. Ð“Ð¾Ð» Ð¾Ð±ÑŒÐµÐºÑ‚Ð¾Ð¾ ÑÑ…ÑÐ½Ð´ Ð½ÑŒ Ð±Ð¸Ñ‡</li>
                <li>2. ÐžÑ€Ñ‡Ð¸Ð½, Ó©Ð½Ð³Ó©, Ð³ÑÑ€Ð»ÑÑ Ð´Ð°Ñ€Ð°Ð° Ð½ÑŒ Ð½ÑÐ¼</li>
                <li>3. Ð¥ÑÑ€ÑÐ³Ñ‚ÑÐ¹ Ð±Ð¾Ð» Ð»Ð°Ð²Ð»Ð°Ñ… Ð·ÑƒÑ€Ð³Ð°Ð° Ñ…Ð°Ð²ÑÐ°Ñ€Ð³Ð°</li>
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-cyan-100 bg-cyan-50/70 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">ÐšÑ€ÐµÐ´Ð¸Ñ‚ Ð·Ó©Ð²Ñ…Ó©Ð½ Ð°Ð¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ Ò¯Ò¯ÑÑÑÐ½ Ò¯ÐµÐ´ Ñ…Ð°ÑÐ°Ð³Ð´Ð°Ð½Ð°.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">ÐÐ»Ð´Ð°Ð° Ð³Ð°Ñ€Ð²Ð°Ð» Ñ‚Ð°Ð½Ñ‹ Ò¯Ð»Ð´ÑÐ³Ð´ÑÐ» ÐºÑ€ÐµÐ´Ð¸Ñ‚ÑÐ´ Ó©Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚ Ð¾Ñ€Ð¾Ñ…Ð³Ò¯Ð¹.</p>
            </div>
          </aside>
        </div>

        <section className="mt-5 rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_22px_50px_rgba(9,38,66,0.08)] sm:p-6">
          {isPending ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-cyan-200 bg-cyan-50/40 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">Ð—ÑƒÑ€Ð°Ð³ Ò¯Ò¯ÑÐ³ÑÐ¶ Ð±Ð°Ð¹Ð½Ð°...</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                Ð¥Ò¯ÑÑÐ»Ñ‚Ð¸Ð¹Ð³ Ð±Ð¾Ð»Ð¾Ð²ÑÑ€ÑƒÑƒÐ»Ð¶ Ð±Ð°Ð¹Ð½Ð°. Ð”ÑƒÑƒÑÐ¼Ð°Ð³Ñ† ÑÐ½Ð´ preview Ð±Ð¾Ð»Ð¾Ð½ download Ñ‚Ð¾Ð²Ñ‡ Ð³Ð°Ñ€Ñ‡ Ð¸Ñ€Ð½Ñ.
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.image_url} alt="Ò®Ò¯ÑÐ³ÑÑÑÐ½ Ð·ÑƒÑ€Ð°Ð³" className="w-full object-cover" />
              </div>

              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">{aspectRatio}</span>
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">PNG</span>
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">{result.cost} ÐºÑ€ÐµÐ´Ð¸Ñ‚</span>
                </div>
                <a
                  href={result.image_url}
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Ð—ÑƒÑ€Ð°Ð³ Ñ‚Ð°Ñ‚Ð°Ñ…
                </a>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">Ð¢Ð°Ð½Ñ‹ Ð·ÑƒÑ€Ð°Ð³ ÑÐ½Ð´ Ð³Ð°Ñ€Ð½Ð°</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                ÐŸÑ€Ð¾Ð¼Ð¿Ñ‚Ð¾Ð¾ ÑÐ°Ð¹Ð½ Ñ‚Ð¾Ð´Ð¾Ñ€Ñ…Ð¾Ð¹ Ð±Ð¸Ñ‡ÑÑÐ´ Ò¯Ò¯ÑÐ³ÑÑ…ÑÐ´ Ñ…Ð°Ð½Ð³Ð°Ð»Ñ‚Ñ‚Ð°Ð¹. ÐœÐ¾Ð±Ð°Ð¹Ð» Ð´ÑÑÑ€ preview Ñ‚Ð¾Ð¼Ð¾Ð¾Ñ€ Ñ…Ð°Ñ€Ð°Ð³Ð´Ð°Ñ… Ð±Ð°Ð¹Ð´Ð»Ð°Ð°Ñ€ Ñ‚Ð¾Ñ…Ð¸Ñ€ÑƒÑƒÐ»ÑÐ°Ð½.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

