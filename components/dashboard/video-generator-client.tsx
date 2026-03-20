"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";

import { GenerationPricingCard } from "@/components/dashboard/generation-pricing-card";
import { SpeechToTextControl } from "@/components/dashboard/speech-to-text-control";
import { creditsToMnt, formatMnt, getVideoCredits } from "@/lib/generation-pricing";
import { containsCyrillicText, type OptimizedPromptResponse } from "@/lib/prompt-optimizer";
import { calculateFinalCreditCost } from "@/lib/pricing";
import { VIDEO_DURATIONS, VIDEO_QUALITIES } from "@/lib/video-models/types";
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
  creditPriceMnt,
  modelBaseCost,
  tariffMultiplier,
}: {
  currentCredits: number;
  history: VideoHistoryItem[];
  creditPriceMnt: number;
  modelBaseCost: number;
  tariffMultiplier: number;
}) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [quality, setQuality] = useState<VideoQuality>("720p");
  const [isPending, setIsPending] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptOptimizationInfo, setPromptOptimizationInfo] = useState<string | null>(null);
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

  function handlePromptChange(nextValue: string) {
    setPrompt(nextValue);
    setPromptOptimizationInfo(null);
  }

  async function optimizePrompt(options?: { applyToInput?: boolean; silent?: boolean }) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError("Эхлээд prompt-оо оруулна уу.");
      return null;
    }

    setIsOptimizingPrompt(true);

    if (!options?.silent) {
      setError(null);
    }

    try {
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          target: "video",
          duration,
          quality,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (OptimizedPromptResponse & { error?: string })
        | null;

      if (!response.ok || !payload?.optimizedPrompt) {
        if (!options?.silent) {
          setError(payload?.error ?? "Prompt сайжруулах үед алдаа гарлаа.");
        }
        return null;
      }

      if (options?.applyToInput !== false) {
        setPrompt(payload.optimizedPrompt);
      }

      setPromptOptimizationInfo(
        payload.notesMn ??
          "Монгол prompt-ийг video generation-д тохирсон English prompt болгон сайжрууллаа.",
      );

      return payload.optimizedPrompt;
    } catch {
      if (!options?.silent) {
        setError("Prompt сайжруулах үед алдаа гарлаа. Дахин оролдоно уу.");
      }
      return null;
    } finally {
      setIsOptimizingPrompt(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Зөвхөн зураг файл оруулна уу.");
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
      setError("Зөвхөн зураг файл оруулна уу.");
      return;
    }

    setError(null);
    replaceFile(dropped);
  }

  async function handleSubmit() {
    setError(null);
    const availableCredits = result ? result.credits_remaining : currentCredits;
    const baseCost = getVideoCredits(duration, quality, modelBaseCost);
    const currentCost = calculateFinalCreditCost(baseCost, tariffMultiplier);

    if (!file) {
      setError("Эх зураг сонгоно уу.");
      return;
    }

    if (!prompt.trim()) {
      setError("Тайлбар хоосон байна.");
      return;
    }

    if (quality === "1080p" && duration === 10) {
      setError("1080p чанар зөвхөн 5 секундын видеод дэмжигдэнэ.");
      return;
    }

    if (availableCredits < currentCost) {
      setError(`Үлдэгдэл хүрэлцэхгүй байна. ${formatMnt(creditsToMnt(currentCost, creditPriceMnt))} шаардлагатай.`);
      return;
    }

    setIsPending(true);

    try {
      let promptForGeneration = prompt.trim();

      if (containsCyrillicText(promptForGeneration)) {
        const optimizedPrompt = await optimizePrompt({ applyToInput: true });

        if (!optimizedPrompt) {
          return;
        }

        promptForGeneration = optimizedPrompt;
      }

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setError(uploadPayload.error ?? "Зураг оруулахад алдаа гарлаа.");
        return;
      }

      const imageUrl = uploadPayload.url as string;
      const generateResponse = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptForGeneration,
          image_url: imageUrl,
          duration,
          quality,
        }),
      });
      const generatePayload = await generateResponse.json();

      if (!generateResponse.ok) {
        setError(generatePayload.error ?? "Видео үүсгэхэд алдаа гарлаа.");
        return;
      }

      setResult(generatePayload as GenerateVideoResult);
      setPrompt("");
      setPromptOptimizationInfo(null);
      replaceFile(null);
      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setPrompt("");
    replaceFile(null);
    setResult(null);
    setError(null);
    setPromptOptimizationInfo(null);
  }

  const creditsRemaining = result ? result.credits_remaining : currentCredits;
  const baseCost = getVideoCredits(duration, quality, modelBaseCost);
  const currentCost = calculateFinalCreditCost(baseCost, tariffMultiplier);
  const currentCostMnt = creditsToMnt(currentCost, creditPriceMnt);
  const hasEnoughCredits = creditsRemaining >= currentCost;

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-0 lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)]">
      <div className="generator-shell-surface border-b border-[rgba(14,42,66,0.08)] bg-white/70 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="space-y-5 p-4 sm:p-6">
            <GenerationPricingCard
              currentCost={formatMnt(currentCostMnt)}
              description="Runway-ийн үнэ нь хугацаа болон чанараасаа хамаарна."
              metrics={[
                {
                  label: "Үргэлжлэх хугацаа",
                  value: `${duration} сек`,
                  detail:
                    quality === "720p" && duration === 5
                      ? formatMnt(creditsToMnt(modelBaseCost, creditPriceMnt))
                      : formatMnt(creditsToMnt(getVideoCredits(10, "720p", modelBaseCost), creditPriceMnt)),
                },
                {
                  label: "Чанар",
                  value: quality,
                  detail:
                    quality === "720p" && duration === 5
                      ? `5 сек 720p = ${formatMnt(creditsToMnt(modelBaseCost, creditPriceMnt))}`
                      : `10 сек 720p эсвэл 5 сек 1080p = ${formatMnt(creditsToMnt(getVideoCredits(10, "720p", modelBaseCost), creditPriceMnt))}`,
                },
                {
                  label: "Гарах үнэ",
                  value: formatMnt(currentCostMnt),
                  detail: "Видео бүрээр бодогдоно",
                },
              ]}
            />

            <section className="generator-panel rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Эх зураг</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Mobile дээр дараад эсвэл desktop дээр drag and drop хийгээд оруулна.</p>
                </div>
                <span className="generator-chip rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
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
                    ? "generator-dropzone-active border-cyan-400 bg-cyan-50"
                    : preview
                      ? "generator-dropzone-filled cursor-default border-slate-200 bg-slate-50"
                      : "generator-dropzone border-cyan-300 bg-cyan-50/60 hover:border-cyan-400 hover:bg-cyan-50"
                }`}
              >
                {preview ? (
                  <div className="generator-result-card relative w-full overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Эх зураг" className="max-h-72 w-full object-contain" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        replaceFile(null);
                      }}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/85 text-white"
                      aria-label="Зураг хасах"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="generator-empty-icon flex h-14 w-14 items-center justify-center rounded-full bg-white text-cyan-700 shadow-sm">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Эх зургаа оруулах</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Нэг зураг сонгож хөдөлгөөнийг нь тайлбараараа тодорхойлно.
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
                  {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </section>

            <section className="generator-panel rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Тайлбар</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Камерын хөдөлгөөн, объектын animation, орчны динамикаа тайлбарлана уу.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Монгол prompt байвал English video prompt болгон сайжруулна.</p>
                <button
                  type="button"
                  onClick={() => void optimizePrompt({ applyToInput: true })}
                  disabled={!prompt.trim() || isPending || isOptimizingPrompt}
                  className="generator-outline-btn rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isOptimizingPrompt ? "AI сайжруулж байна..." : "AI Prompt сайжруулах"}
                </button>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => handlePromptChange(event.target.value)}
                placeholder="Жишээ: Камер удаанаар zoom in хийж, үс салхинд зөөлөн хөдөлж, cinematic cyan light туссан байдал..."
                rows={5}
                className="generator-input mt-4 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />

              <SpeechToTextControl
                value={prompt}
                onChange={handlePromptChange}
                className="mt-4"
              />

              {promptOptimizationInfo ? (
                <div className="generator-note mt-4 rounded-[1rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                  {promptOptimizationInfo}
                </div>
              ) : null}
            </section>

            <section className="generator-panel grid gap-4 rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Видео тохиргоо</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Видеоны урт болон чанараа сонгоно уу.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Үргэлжлэх хугацаа</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_DURATIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setDuration(item)}
                        className={`rounded-[1rem] border px-3 py-3 text-sm font-medium transition ${
                          duration === item
                            ? "generator-option-active border-cyan-400 bg-cyan-50 text-cyan-900 shadow-[0_16px_32px_rgba(18,159,213,0.16)]"
                            : "generator-option-idle border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-200 hover:bg-white"
                        }`}
                      >
                        {item} сек
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Чанар</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_QUALITIES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuality(item)}
                        disabled={item === "1080p" && duration === 10}
                        className={`rounded-[1rem] border px-3 py-3 text-sm font-medium transition ${
                          quality === item
                            ? "generator-option-active border-cyan-400 bg-cyan-50 text-cyan-900 shadow-[0_16px_32px_rgba(18,159,213,0.16)]"
                            : "generator-option-idle border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-200 hover:bg-white"
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

          <div className="generator-footer mt-auto border-t border-[rgba(14,42,66,0.08)] bg-white/90 p-4 sm:p-6">
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
                    Видео боловсруулж байна...
                  </>
                ) : (
                  `Видео үүсгэх · ${currentCost} кр · ${formatMnt(currentCostMnt)}`
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="generator-secondary-btn rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Цэвэрлэх
              </button>
            </div>
            {!hasEnoughCredits ? (
              <p className="mt-3 text-sm text-amber-700">
                Үлдэгдэл хүрэлцэхгүй байна. Доод тал нь {formatMnt(currentCostMnt)} шаардлагатай.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="generator-stage-surface bg-[radial-gradient(circle_at_top_right,rgba(132,224,239,0.24),transparent_28%),linear-gradient(180deg,rgba(247,252,255,0.72),rgba(239,248,251,0.95))] p-4 sm:p-6 lg:p-8">
        <section className="generator-stage-surface rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_22px_50px_rgba(9,38,66,0.08)] sm:p-6">
          <div className="generator-panel rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Гаралт</h3>
                <p className="mt-1 text-sm text-slate-500">Үүссэн видео энд preview болон татах хэлбэрээр харагдана.</p>
              </div>
              <span className="generator-chip-accent rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">Видео</span>
            </div>

            {isPending ? (
              <div className="generator-note flex min-h-[20rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-cyan-200 bg-cyan-50/40 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <h4 className="mt-5 text-xl font-semibold text-slate-950">Видео үүсгэж байна...</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Энэ процесс зураг үүсгэхээс арай урт үргэлжилж болно. Дуусмагц preview автоматаар шинэчлэгдэнэ.
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-sm">
                  <video controls src={result.video_url} className="w-full" />
                </div>

                <div className="generator-card flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="generator-chip rounded-full bg-white px-3 py-1 font-medium">{duration} сек</span>
                    <span className="generator-chip rounded-full bg-white px-3 py-1 font-medium">{quality}</span>
                    <span className="generator-chip rounded-full bg-white px-3 py-1 font-medium">{formatMnt(creditsToMnt(result.cost, creditPriceMnt))}</span>
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
                    Видео татах
                  </a>
                </div>
              </div>
            ) : (
              <div className="generator-empty flex min-h-[20rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 text-center">
                <div className="generator-empty-icon flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 8-6 4 6 4V8z" />
                    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                  </svg>
                </div>
                <h4 className="mt-5 text-xl font-semibold text-slate-950">Таны видео энд гарна</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Эх зургаа оруулаад тайлбараа сайн тодорхойлбол илүү тогтвортой хөдөлгөөнтэй видео гарна.
                </p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Сүүлийн видеонууд</h3>
                  <p className="mt-1 text-sm text-slate-500">Өмнөх ажлуудаа mobile card хэлбэрээр тоймлон харна.</p>
                </div>
                <span className="generator-chip rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {history.length} видео
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="generator-result-card overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
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
                        <span className="generator-chip rounded-full bg-slate-100 px-3 py-1">{item.created_at_label}</span>
                        <span className="generator-chip rounded-full bg-slate-100 px-3 py-1">{item.duration} сек</span>
                        <span className="generator-chip rounded-full bg-slate-100 px-3 py-1">{item.quality}</span>
                        <span className="generator-chip rounded-full bg-slate-100 px-3 py-1">{formatMnt(creditsToMnt(item.cost, creditPriceMnt))}</span>
                      </div>
                      <a
                        href={item.video_url}
                        download
                        className="generator-secondary-btn inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                        Татах
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
