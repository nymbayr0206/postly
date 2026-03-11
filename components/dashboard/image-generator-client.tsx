"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { GenerationPricingCard } from "@/components/dashboard/generation-pricing-card";
import { SpeechToTextControl } from "@/components/dashboard/speech-to-text-control";
import {
  creditsToMnt,
  formatMnt,
  getImageResolutionCost,
  getImageResolutionDetail,
  getImageResolutionLabel,
  type ImageResolution,
} from "@/lib/generation-pricing";
import { containsCyrillicText, type OptimizedPromptResponse } from "@/lib/prompt-optimizer";
import { calculateFinalCreditCost } from "@/lib/pricing";
import type { ImageAspectRatio } from "@/lib/types";

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

      reject(new Error("Зургийг уншиж чадсангүй."));
    };
    reader.onerror = () => reject(new Error("Зургийг уншиж чадсангүй."));
    reader.readAsDataURL(file);
  });
}

const ASPECT_RATIOS: Array<{ value: ImageAspectRatio; label: string; detail: string }> = [
  { value: "1:1", label: "1:1", detail: "Пост, квадрат зураг" },
  { value: "4:5", label: "4:5", detail: "Instagram босоо пост" },
  { value: "16:9", label: "16:9", detail: "Cover болон banner" },
  { value: "9:19", label: "9:19", detail: "Story, Reel босоо кадр" },
];

const IMAGE_RESOLUTION_OPTIONS: Array<{
  value: ImageResolution;
  label: string;
  detail: string;
}> = [
  { value: "1k", label: "1K", detail: "8 кредит" },
  { value: "2k", label: "2K", detail: "12 кредит" },
  { value: "4k", label: "4K", detail: "18 кредит" },
];

const PROMPT_HINTS = [
  "Өнгө, гэрэлтүүлэг, камерын өнцгөө тодорхой бич.",
  "Брэндийн мэдрэмж, орчин, уур амьсгалаа оруул.",
  "Лавлах зураг ашиглавал илүү тогтвортой гарна.",
];

const QUICK_CHECKLIST = [
  "Гол объект, орчноо эхэнд нь бич.",
  "Өнгө, гэрэл, camera style-аа дараа нь нэм.",
  "Хэрэгтэй бол 1-3 лавлах зураг хавсарга.",
];

export function ImageGeneratorClient({
  currentCredits,
  creditPriceMnt,
  tariffMultiplier,
}: {
  currentCredits: number;
  creditPriceMnt: number;
  tariffMultiplier: number;
}) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("1:1");
  const [resolution, setResolution] = useState<ImageResolution>("1k");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptOptimizationInfo, setPromptOptimizationInfo] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      setError("Хамгийн ихдээ 3 лавлах зураг оруулна.");
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
          target: "image",
          aspectRatio,
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
          "Монгол prompt-ийг image generation-д тохирсон English prompt болгон сайжрууллаа.",
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const availableCredits = result ? result.credits_remaining : currentCredits;
    const baseCost = getImageResolutionCost(resolution);
    const currentCost = calculateFinalCreditCost(baseCost, tariffMultiplier);

    if (!prompt.trim()) {
      setError("Тайлбар хоосон байна.");
      return;
    }

    if (availableCredits < currentCost) {
      setError(`Кредит хүрэлцэхгүй байна. ${currentCost} кредит шаардлагатай.`);
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

      const referenceImages = await Promise.all(files.map((file) => fileToDataUrl(file)));
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptForGeneration,
          aspect_ratio: aspectRatio,
          resolution,
          reference_images: referenceImages,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Алдаа гарлаа.");
        return;
      }

      setResult(payload as GenerateResult);
      setPrompt("");
      setPromptOptimizationInfo(null);
      resetReferences();
      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setPrompt("");
    resetReferences();
    setResult(null);
    setError(null);
    setPromptOptimizationInfo(null);
  }

  const creditsRemaining = result ? result.credits_remaining : currentCredits;
  const baseCost = getImageResolutionCost(resolution);
  const currentCost = calculateFinalCreditCost(baseCost, tariffMultiplier);
  const currentCostMnt = creditsToMnt(currentCost, creditPriceMnt);
  const hasEnoughCredits = creditsRemaining >= currentCost;
  const selectedAspectRatio = ASPECT_RATIOS.find((ratio) => ratio.value === aspectRatio);
  const selectedResolution = IMAGE_RESOLUTION_OPTIONS.find((option) => option.value === resolution);
  const summaryItems = [
    { label: "Үнэ", value: `${currentCost} кр`, detail: formatMnt(currentCostMnt) },
    { label: "Үлдэгдэл", value: String(creditsRemaining), detail: "Кредит" },
    {
      label: "Харьцаа",
      value: aspectRatio,
      detail: selectedAspectRatio?.detail ?? "Зургийн хэлбэр",
    },
    {
      label: "Нягтрал",
      value: selectedResolution?.label ?? resolution.toUpperCase(),
      detail: selectedResolution?.detail ?? "Сонгосон чанар",
    },
  ];

  function renderPreviewPanel(minHeightClass: string) {
    if (isPending) {
      return (
        <div className={`flex ${minHeightClass} flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-cyan-200 bg-cyan-50/40 px-6 text-center`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
            <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-950">Зураг үүсгэж байна...</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Хүсэлтийг боловсруулж байна. Дуусмагц энд preview болон татах товч гарч ирнэ.
          </p>
        </div>
      );
    }

    if (result) {
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.image_url} alt="Үүсгэсэн зураг" className="w-full object-cover" />
          </div>

          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">{aspectRatio}</span>
              <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">PNG</span>
              <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">{result.cost} кредит</span>
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
              Зураг татах
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${minHeightClass} flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <h3 className="mt-5 text-xl font-semibold text-slate-950">Таны зураг энд гарна</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Тайлбараа сайн тодорхой бичээд үүсгэхэд хангалттай. Preview үргэлж дээр харагдах тул
          утаснаас ажиллахад илүү ойлгомжтой болсон.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
      <section className="order-1 rounded-[2rem] border border-cyan-100/60 bg-[radial-gradient(circle_at_top_right,rgba(132,224,239,0.24),transparent_28%),linear-gradient(180deg,rgba(247,252,255,0.72),rgba(239,248,251,0.95))] p-4 shadow-[0_18px_40px_rgba(9,38,66,0.08)] sm:p-6 2xl:order-2 2xl:sticky 2xl:top-6 2xl:self-start">
        <div className="rounded-[1.6rem] border border-white/80 bg-white/90 p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Preview</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Үр дүнгээ үргэлж дээд талд нь хар</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Split layout одоо зөвхөн том дэлгэц дээр асна. Бусад үед нэг урсгалтай, цэвэр бүтэцтэй.
              </p>
            </div>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
              {isPending ? "Үүсгэж байна" : result ? "Бэлэн" : "Хүлээж байна"}
            </span>
          </div>

          <div className="mt-4">{renderPreviewPanel("min-h-[18rem] sm:min-h-[22rem] xl:min-h-[26rem]")}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="rounded-[1.25rem] border border-cyan-100 bg-white/85 px-4 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Хурдан checklist</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {QUICK_CHECKLIST.map((item, index) => (
                <li key={item}>
                  {index + 1}. {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.25rem] border border-cyan-100 bg-cyan-50/80 px-4 py-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Кредит зөвхөн амжилттай үүссэн үед хасагдана.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Алдаа гарвал үлдэгдэлд өөрчлөлт орохгүй. Үнэ, харьцаа, нягтралыг дээрээс шууд харна.
            </p>
          </div>
        </div>
      </section>

      <div className="order-2 overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/70 2xl:order-1">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="space-y-4 p-4 pb-28 sm:space-y-5 sm:p-6 sm:pb-32 xl:pb-6">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,248,252,0.92))] p-5 shadow-[0_20px_45px_rgba(9,38,66,0.06)]">
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <span className="inline-flex w-fit rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">
                    Nano Banana
                  </span>
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-950">Зураг үүсгэх</h1>
                    <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">
                      Одоо mobile, tablet, desktop дээр нэг логиктой урсгалтай. Эхлээд тайлбараа
                      оруулаад, дараа нь лавлах зураг болон тохиргоогоо нэмнэ.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Үлдэгдэл</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{creditsRemaining}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Үнэ</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{currentCost} кр</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Харьцаа</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{aspectRatio}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Лавлах</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{files.length}/3</p>
                  </div>
                </div>
              </div>
            </div>

            <GenerationPricingCard
              className="hidden xl:block"
              currentCost={currentCost}
              currentCostDetail={formatMnt(currentCostMnt)}
              description="Nano Banana 2 нь нягтралаасаа хамаарч 1K, 2K, 4K сонголтоор өөр үнэ бодно."
              metrics={[
                {
                  label: "Сонгосон нягтрал",
                  value: getImageResolutionLabel(resolution),
                  detail: `${getImageResolutionDetail(resolution)} · ${formatMnt(creditsToMnt(baseCost, creditPriceMnt))}`,
                },
                {
                  label: "Харьцаа",
                  value: aspectRatio,
                  detail: "Зургийн хэлбэр",
                },
                {
                  label: "Лавлах зураг",
                  value: `${files.length}/3`,
                  detail: "Хүсвэл хавсаргана",
                },
              ]}
            />

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Тайлбар</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Яг ямар дүрслэл хүсэж байгаагаа тодорхой бичнэ үү.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={() => void optimizePrompt({ applyToInput: true })}
                    disabled={!prompt.trim() || isPending || isOptimizingPrompt}
                    className="inline-flex w-full items-center justify-center rounded-full border border-cyan-200 bg-white px-4 py-2 text-xs font-semibold text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isOptimizingPrompt ? "AI сайжруулж байна..." : "AI Prompt сайжруулах"}
                  </button>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-medium text-slate-600">
                    {prompt.trim().length} тэмдэгт
                  </span>
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => handlePromptChange(event.target.value)}
                placeholder="Жишээ: Минимал студид байрласан бүтээгдэхүүний зураг, зөөлөн cyan гэрэлтүүлэгтэй, cinematic product shot, clean background..."
                rows={6}
                className="mt-4 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />

              <SpeechToTextControl
                value={prompt}
                onChange={handlePromptChange}
                className="mt-4"
              />

              {promptOptimizationInfo ? (
                <div className="mt-4 rounded-[1rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                  {promptOptimizationInfo}
                </div>
              ) : null}

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                {PROMPT_HINTS.map((hint) => (
                  <div
                    key={hint}
                    className="min-w-[12rem] shrink-0 rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600 sm:min-w-0"
                  >
                    {hint}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Лавлах зураг</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Хүсвэл 3 хүртэл зураг хавсаргаж болно.</p>
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
                      <img src={src} alt="Лавлах зураг" className="aspect-square h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/80 text-sm text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Зураг хасах"
                      >
                        ×
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
                Зураг нэмэх
              </button>
            </section>

            <div className="xl:hidden">
              <button
                type="button"
                onClick={() => setSettingsOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white/80 px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">Нэмэлт тохиргоо</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{aspectRatio}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{selectedResolution?.label}</span>
                  </div>
                </div>
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

            <section className={`${settingsOpen ? "block" : "hidden xl:block"} rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5`}>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Харьцаа</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Хэрэглээний сувгаасаа хамаарч харьцаагаа сонгоно уу.</p>
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 xl:hidden">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`min-w-[9.5rem] shrink-0 rounded-[1.25rem] border px-4 py-4 text-left transition ${
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

              <div className="mt-4 hidden grid-cols-2 gap-3 xl:grid">
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

              <div className="mt-5">
                <h2 className="text-sm font-semibold text-slate-900">Нягтрал</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Nano Banana 2-ийн үнэ нягтралаасаа хамаарч өөр өөр байна.
                </p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1 xl:hidden">
                  {IMAGE_RESOLUTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setResolution(option.value)}
                      className={`min-w-[8.5rem] shrink-0 rounded-[1.25rem] border px-4 py-4 text-left transition ${
                        resolution === option.value
                          ? "border-cyan-400 bg-cyan-50 text-cyan-900 shadow-[0_16px_32px_rgba(18,159,213,0.16)]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-200 hover:bg-white"
                      }`}
                    >
                      <p className="text-base font-semibold">{option.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{option.detail}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-4 hidden grid-cols-3 gap-3 xl:grid">
                  {IMAGE_RESOLUTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setResolution(option.value)}
                      className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                        resolution === option.value
                          ? "border-cyan-400 bg-cyan-50 text-cyan-900 shadow-[0_16px_32px_rgba(18,159,213,0.16)]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-200 hover:bg-white"
                      }`}
                    >
                      <p className="text-base font-semibold">{option.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{option.detail}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 z-20 mt-auto border-t border-[rgba(14,42,66,0.08)] bg-white/95 p-4 backdrop-blur sm:p-6 xl:static xl:bg-white/90 xl:backdrop-blur-none">
            {error && (
              <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mb-3 flex items-center justify-between gap-3 xl:hidden">
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{aspectRatio}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{selectedResolution?.label}</span>
                {files.length > 0 ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{files.length} зураг</span> : null}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-950">{currentCost} кредит</p>
                <p className="text-xs text-slate-500">{formatMnt(currentCostMnt)}</p>
              </div>
            </div>

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
                    Зураг боловсруулж байна...
                  </>
                ) : (
                  `Зураг үүсгэх · ${currentCost} кр · ${formatMnt(currentCostMnt)}`
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Цэвэрлэх
              </button>
            </div>
            {!hasEnoughCredits ? (
              <p className="mt-3 text-sm text-amber-700">
                Кредит хүрэлцэхгүй байна. Доод тал нь {currentCost} кредит буюу {formatMnt(currentCostMnt)} шаардлагатай.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
