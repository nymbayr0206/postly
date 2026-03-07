"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";

import { GenerationPricingCard } from "@/components/dashboard/generation-pricing-card";
import { VIDEO_DURATIONS, VIDEO_QUALITIES } from "@/lib/video-models/types";
import type { GenerationPricingPreview } from "@/lib/types";
import type { VideoDuration, VideoQuality } from "@/lib/video-models/types";

type GenerateVideoResult = {
  video_url: string;
  cost: number;
  credits_remaining: number;
};

type VideoHistoryItem = {
  id: string;
  prompt: string;
  video_url: string;
  image_url: string;
  duration: number;
  quality: string;
  cost: number;
  created_at: string;
  created_at_label: string;
};

export function VideoGeneratorClient({
  currentCredits,
  history,
  pricing,
}: {
  currentCredits: number;
  history: VideoHistoryItem[];
  pricing: GenerationPricingPreview;
}) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [quality, setQuality] = useState<VideoQuality>("720p");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateVideoResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function replaceFile(nextFile: File | null) {
    setFile(nextFile);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(nextFile ? URL.createObjectURL(nextFile) : null);

    if (!nextFile && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Ð—Ó©Ð²Ñ…Ó©Ð½ Ð·ÑƒÑ€Ð°Ð³ Ñ„Ð°Ð¹Ð» Ð¾Ñ€ÑƒÑƒÐ»Ð½Ð° ÑƒÑƒ.");
      return;
    }

    setError(null);
    replaceFile(selected);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const dropped = event.dataTransfer.files?.[0] ?? null;

    if (!dropped) {
      return;
    }

    if (!dropped.type.startsWith("image/")) {
      setError("Ð—Ó©Ð²Ñ…Ó©Ð½ Ð·ÑƒÑ€Ð°Ð³ Ñ„Ð°Ð¹Ð» Ð¾Ñ€ÑƒÑƒÐ»Ð½Ð° ÑƒÑƒ.");
      return;
    }

    setError(null);
    replaceFile(dropped);
  }

  async function handleSubmit() {
    setError(null);
    const availableCredits = result ? result.credits_remaining : currentCredits;

    if (!file) {
      setError("Ð­Ñ… Ð·ÑƒÑ€Ð°Ð³ ÑÐ¾Ð½Ð³Ð¾Ð½Ð¾ ÑƒÑƒ.");
      return;
    }

    if (!prompt.trim()) {
      setError("ÐŸÑ€Ð¾Ð¼Ð¿Ñ‚ Ñ…Ð¾Ð¾ÑÐ¾Ð½ Ð±Ð°Ð¹Ð½Ð°.");
      return;
    }

    if (quality === "1080p" && duration === 10) {
      setError("1080p Ñ‡Ð°Ð½Ð°Ñ€ Ð·Ó©Ð²Ñ…Ó©Ð½ 5 ÑÐµÐºÑƒÐ½Ð´Ð¸Ð¹Ð½ Ð²Ð¸Ð´ÐµÐ¾Ð´ Ð´ÑÐ¼Ð¶Ð¸Ð³Ð´ÑÐ½Ñ.");
      return;
    }


    if (availableCredits < pricing.current_cost) {
      setError(`Кредит хүрэлцэхгүй байна. ${pricing.current_cost} кредит шаардлагатай.`);
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
      const uploadPayload = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setError(uploadPayload.error ?? "Ð—ÑƒÑ€Ð°Ð³ Ð¾Ñ€ÑƒÑƒÐ»Ð°Ñ…Ð°Ð´ Ð°Ð»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°.");
        return;
      }

      const imageUrl = uploadPayload.url as string;
      const generateResponse = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image_url: imageUrl,
          duration,
          quality,
        }),
      });
      const generatePayload = await generateResponse.json();

      if (!generateResponse.ok) {
        setError(generatePayload.error ?? "Ð’Ð¸Ð´ÐµÐ¾ Ò¯Ò¯ÑÐ³ÑÑ…ÑÐ´ Ð°Ð»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°.");
        return;
      }

      setResult(generatePayload as GenerateVideoResult);
      setPrompt("");
      replaceFile(null);
      router.refresh();
    } catch {
      setError("ÐÐ»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°. Ð”Ð°Ñ…Ð¸Ð½ Ð¾Ñ€Ð¾Ð»Ð´Ð¾Ð½Ð¾ ÑƒÑƒ.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setPrompt("");
    replaceFile(null);
    setResult(null);
    setError(null);
  }

  const creditsRemaining = result ? result.credits_remaining : currentCredits;
  const hasEnoughCredits = creditsRemaining >= pricing.current_cost;

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-0 lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)]">
      <div className="border-b border-[rgba(14,42,66,0.08)] bg-white/70 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="space-y-5 p-4 sm:p-6">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,248,252,0.92))] p-5 shadow-[0_20px_45px_rgba(9,38,66,0.06)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                    Image to Video
                  </span>
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-950">Ð—ÑƒÑ€Ð³Ð°Ð°Ñ Ð²Ð¸Ð´ÐµÐ¾</h1>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">
                      Ð­Ñ… Ð·ÑƒÑ€Ð³Ð¸Ð¹Ð½Ñ…Ð°Ð° Ñ…Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½, ÐºÐ°Ð¼ÐµÑ€Ñ‹Ð½ Ñ‡Ð¸Ð³Ð»ÑÐ», Ð¾Ñ€Ñ‡Ð½Ñ‹ Ð¼ÑÐ´Ñ€ÑÐ¼Ð¶Ð¸Ð¹Ð³ Ñ‚Ð°Ð¹Ð»Ð±Ð°Ñ€Ð»Ð°Ð°Ð´ Ð±Ð¾Ð³Ð¸Ð½Ð¾ Ð²Ð¸Ð´ÐµÐ¾ Ò¯Ò¯ÑÐ³ÑÐ½Ñ.
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
                  <h2 className="text-sm font-semibold text-slate-900">Ð­Ñ… Ð·ÑƒÑ€Ð°Ð³</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Mobile Ð´ÑÑÑ€ Ð´Ð°Ñ€Ð°Ð°Ð´ ÑÑÐ²ÑÐ» desktop Ð´ÑÑÑ€ drag & drop Ñ…Ð¸Ð¹Ð¶ Ð¾Ñ€ÑƒÑƒÐ»Ð½Ð°.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  JPG, PNG, WebP
                </span>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => !preview && fileInputRef.current?.click()}
                className={`mt-4 flex min-h-[14rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border-2 border-dashed px-6 text-center transition ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-50"
                    : preview
                      ? "cursor-default border-slate-200 bg-slate-50"
                      : "border-cyan-300 bg-cyan-50/60 hover:border-cyan-400 hover:bg-cyan-50"
                }`}
              >
                {preview ? (
                  <div className="relative w-full overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="max-h-72 w-full object-contain" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        replaceFile(null);
                      }}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/85 text-white"
                    >
                      Ã—
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-cyan-700 shadow-sm">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Ð­Ñ… Ð·ÑƒÑ€Ð³Ð°Ð° Ð¾Ñ€ÑƒÑƒÐ»Ð°Ñ…</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        ÐÑÐ³ Ð·ÑƒÑ€Ð°Ð³ ÑÐ¾Ð½Ð³Ð¾Ð¶ Ñ…Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½Ð¸Ð¹Ð³ Ð½ÑŒ Ð¿Ñ€Ð¾Ð¼Ð¿Ñ‚Ð¾Ð¾Ñ€ Ñ‚Ð¾Ð´Ð¾Ñ€Ñ…Ð¾Ð¹Ð»Ð½Ð¾.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {file && (
                <p className="mt-3 text-xs text-slate-500">
                  {file.name} Â· {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">ÐŸÑ€Ð¾Ð¼Ð¿Ñ‚</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  ÐšÐ°Ð¼ÐµÑ€Ñ‹Ð½ Ñ…Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½, subject animation, Ð¾Ñ€Ñ‡Ð½Ñ‹ Ð´Ð¸Ð½Ð°Ð¼Ð¸ÐºÐ°Ð° Ñ‚Ð°Ð¹Ð»Ð±Ð°Ñ€Ð»Ð°Ð½Ð° ÑƒÑƒ.
                </p>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ð–Ð¸ÑˆÑÑ: ÐšÐ°Ð¼ÐµÑ€ ÑƒÐ´Ð°Ð°Ð½Ð°Ð°Ñ€ zoom in Ñ…Ð¸Ð¹Ð¶, Ò¯Ñ ÑÐ°Ð»Ñ…Ð¸Ð½Ð´ Ð½Ð°Ð¼ÑƒÑƒÑ…Ð°Ð½ Ñ…Ó©Ð´Ó©Ð»Ð¶, cinematic cyan light Ñ‚ÑƒÑÑÐ°Ð½ Ð±Ð°Ð¹Ð´Ð°Ð»..."
                rows={5}
                className="mt-4 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </section>

            <section className="grid gap-4 rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Ð“Ð°Ñ€Ð°Ð»Ñ‚Ñ‹Ð½ Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Ð’Ð¸Ð´ÐµÐ¾Ð½Ñ‹ ÑƒÑ€Ñ‚ Ð±Ð¾Ð»Ð¾Ð½ Ñ‡Ð°Ð½Ð°Ñ€Ð°Ð° ÑÐ¾Ð½Ð³Ð¾Ð½Ð¾ ÑƒÑƒ.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Ò®Ñ€Ð³ÑÐ»Ð¶Ð»ÑÑ… Ñ…ÑƒÐ³Ð°Ñ†Ð°Ð°</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_DURATIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setDuration(item)}
                        className={`rounded-[1rem] border px-3 py-3 text-sm font-medium transition ${
                          duration === item
                            ? "border-cyan-400 bg-cyan-50 text-cyan-900 shadow-[0_16px_32px_rgba(18,159,213,0.16)]"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-200 hover:bg-white"
                        }`}
                      >
                        {item} ÑÐµÐº
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Ð§Ð°Ð½Ð°Ñ€</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_QUALITIES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuality(item)}
                        disabled={item === "1080p" && duration === 10}
                        className={`rounded-[1rem] border px-3 py-3 text-sm font-medium transition ${
                          quality === item
                            ? "border-cyan-400 bg-cyan-50 text-cyan-900 shadow-[0_16px_32px_rgba(18,159,213,0.16)]"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-200 hover:bg-white"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
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
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !hasEnoughCredits}
                className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(135deg,#31c4e8,#129fd5)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(18,159,213,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ð’Ð¸Ð´ÐµÐ¾ Ð±Ð¾Ð»Ð¾Ð²ÑÑ€ÑƒÑƒÐ»Ð¶ Ð±Ð°Ð¹Ð½Ð°...
                  </>
                ) : (
                  `Ð’Ð¸Ð´ÐµÐ¾ Ò¯Ò¯ÑÐ³ÑÑ… Â· ${pricing.current_cost} ÐºÑ€`
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
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top_right,rgba(132,224,239,0.24),transparent_28%),linear-gradient(180deg,rgba(247,252,255,0.72),rgba(239,248,251,0.95))] p-4 sm:p-6 lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] p-6 text-white sm:p-7">
            <div className="relative z-10 flex h-full flex-col justify-between gap-6">
              <div>
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                  Motion preview
                </span>
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Ð­Ñ… Ð·ÑƒÑ€Ð°Ð³Ð½Ð°Ð°Ñ Ð°Ð¼ÑŒÐ´ Ñ…Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½ Ñ€Ò¯Ò¯</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                  Ó¨Ð³ÑÓ©Ð½ Ð·ÑƒÑ€Ð°Ð³, Ð¿Ñ€Ð¾Ð¼Ð¿Ñ‚, Ñ‡Ð°Ð½Ð°Ñ€Ñ‹Ð½ Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾Ð½ÑƒÑƒÐ´ ÑÐ½Ñ Ð´ÑÐ»Ð³ÑÑ† Ð´ÑÑÑ€ Ð½ÑÐ³ Ð¼Ó©Ñ€Ó©Ó©Ñ€ Ñ…Ð°Ñ€Ð°Ð³Ð´Ð°Ð¶ mobile flow-Ð³ Ð¸Ð»Ò¯Ò¯ Ð¾Ð¹Ð»Ð³Ð¾Ð¼Ð¶Ñ‚Ð¾Ð¹ Ð±Ð¾Ð»Ð³Ð¾Ð½Ð¾.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Duration</p>
                  <p className="mt-2 text-lg font-semibold">{duration} ÑÐµÐº</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Quality</p>
                  <p className="mt-2 text-lg font-semibold">{quality}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Source</p>
                  <p className="mt-2 text-lg font-semibold">{file ? "Ð‘ÑÐ»ÑÐ½" : "Ð¥Ò¯Ð»ÑÑÐ¶ Ð±Ð°Ð¹Ð½Ð°"}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ð¡Ð°Ð¹Ð½ prompt-Ñ‹Ð½ Ð±Ò¯Ñ‚ÑÑ†</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>1. Subject ÑÐ¼Ð°Ñ€ Ñ…Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½ Ñ…Ð¸Ð¹Ñ…Ð¸Ð¹Ð³ Ð±Ð¸Ñ‡</li>
                <li>2. ÐšÐ°Ð¼ÐµÑ€Ñ‹Ð½ Ñ‡Ð¸Ð³Ð»ÑÐ»Ð¸Ð¹Ð³ Ñ‚ÑƒÑÐ°Ð´ Ð½ÑŒ Ñ…ÑÐ»</li>
                <li>3. ÐžÑ€Ñ‡Ð½Ñ‹ light, speed, mood-Ð¾Ð¾ Ð½ÑÐ¼</li>
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-cyan-100 bg-cyan-50/70 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">ÐšÑ€ÐµÐ´Ð¸Ñ‚ Ð·Ó©Ð²Ñ…Ó©Ð½ Ð°Ð¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ Ò¯Ò¯ÑÑÑÐ½ Ò¯ÐµÐ´ Ñ…Ð°ÑÐ°Ð³Ð´Ð°Ð½Ð°.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">ÐÐ»Ð´Ð°Ð° Ð³Ð°Ñ€Ð²Ð°Ð» Ò¯Ð»Ð´ÑÐ³Ð´ÑÐ»Ð´ Ó©Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚ Ð¾Ñ€Ð¾Ñ…Ð³Ò¯Ð¹.</p>
            </div>
          </aside>
        </div>

        <section className="mt-5 rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_22px_50px_rgba(9,38,66,0.08)] sm:p-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Ð“Ð°Ñ€Ð°Ð»Ñ‚</h3>
                <p className="mt-1 text-sm text-slate-500">Ò®Ò¯ÑÑÑÐ½ Ð²Ð¸Ð´ÐµÐ¾ ÑÐ½Ð´ preview Ð±Ð¾Ð»Ð¾Ð½ download Ñ…ÑÐ»Ð±ÑÑ€ÑÑÑ€ Ñ…Ð°Ñ€Ð°Ð³Ð´Ð°Ð½Ð°.</p>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">Video</span>
            </div>

            {isPending ? (
              <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-cyan-200 bg-cyan-50/40 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <h4 className="mt-5 text-xl font-semibold text-slate-950">Ð’Ð¸Ð´ÐµÐ¾ Ò¯Ò¯ÑÐ³ÑÐ¶ Ð±Ð°Ð¹Ð½Ð°...</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Ð­Ð½Ñ Ð¿Ñ€Ð¾Ñ†ÐµÑÑ Ð·ÑƒÑ€Ð°Ð³ Ò¯Ò¯ÑÐ³ÑÑ…ÑÑÑ Ð°Ñ€Ð°Ð¹ ÑƒÑ€Ñ‚ Ò¯Ñ€Ð³ÑÐ»Ð¶Ð¸Ð»Ð¶ Ð±Ð¾Ð»Ð½Ð¾. Ð”ÑƒÑƒÑÐ¼Ð°Ð³Ñ† preview Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð°Ð°Ñ€ ÑˆÐ¸Ð½ÑÑ‡Ð»ÑÐ³Ð´ÑÐ½Ñ.
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-sm">
                  <video controls src={result.video_url} className="w-full" />
                </div>

                <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 font-medium">{duration} ÑÐµÐº</span>
                    <span className="rounded-full bg-white px-3 py-1 font-medium">{quality}</span>
                    <span className="rounded-full bg-white px-3 py-1 font-medium">{result.cost} ÐºÑ€ÐµÐ´Ð¸Ñ‚</span>
                  </div>
                  <a
                    href={result.video_url}
                    download
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    Ð’Ð¸Ð´ÐµÐ¾ Ñ‚Ð°Ñ‚Ð°Ñ…
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 8-6 4 6 4V8z" />
                    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                  </svg>
                </div>
                <h4 className="mt-5 text-xl font-semibold text-slate-950">Ð¢Ð°Ð½Ñ‹ Ð²Ð¸Ð´ÐµÐ¾ ÑÐ½Ð´ Ð³Ð°Ñ€Ð½Ð°</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Ð­Ñ… Ð·ÑƒÑ€Ð³Ð°Ð° Ð¾Ñ€ÑƒÑƒÐ»Ð°Ð°Ð´ prompt-Ð¾Ð¾ ÑÐ°Ð¹Ð½ Ñ‚Ð¾Ð´Ð¾Ñ€Ñ…Ð¾Ð¹Ð»Ð±Ð¾Ð» Ð¸Ð»Ò¯Ò¯ Ñ‚Ð¾Ð³Ñ‚Ð²Ð¾Ñ€Ñ‚Ð¾Ð¹ Ñ…Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½Ñ‚ÑÐ¹ Ð²Ð¸Ð´ÐµÐ¾ Ð³Ð°Ñ€Ð½Ð°.
                </p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Ð¡Ò¯Ò¯Ð»Ð¸Ð¹Ð½ Ð²Ð¸Ð´ÐµÐ¾Ð½ÑƒÑƒÐ´</h3>
                  <p className="mt-1 text-sm text-slate-500">Ó¨Ð¼Ð½Ó©Ñ… Ð°Ð¶Ð»ÑƒÑƒÐ´Ð°Ð° mobile card Ñ…ÑÐ»Ð±ÑÑ€ÑÑÑ€ Ñ‚Ð¾Ð¹Ð¼Ð»Ð¾Ð½ Ñ…Ð°Ñ€Ð°Ð°Ñ€Ð°Ð¹.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {history.length} Ð²Ð¸Ð´ÐµÐ¾
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="aspect-video bg-slate-950">
                      <video
                        src={item.video_url}
                        poster={item.image_url}
                        controls
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.prompt}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">{item.created_at_label}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{item.duration} ÑÐµÐº</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{item.quality}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{item.cost} ÐºÑ€ÐµÐ´Ð¸Ñ‚</span>
                      </div>
                      <a
                        href={item.video_url}
                        download
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                        Ð¢Ð°Ñ‚Ð°Ñ…
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

