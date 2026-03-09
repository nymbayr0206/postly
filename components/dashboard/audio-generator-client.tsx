"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GenerationPricingCard } from "@/components/dashboard/generation-pricing-card";
import { ELEVENLABS_VOICES } from "@/lib/audio-models/types";
import type { ElevenLabsVoice } from "@/lib/audio-models/types";
import {
  calculateAudioCreditsByCharacterCount,
  countDialogueCharacters,
  creditsToMnt,
  formatCredits,
  formatMnt,
} from "@/lib/generation-pricing";
import { calculateFinalCreditCost } from "@/lib/pricing";

type DialogueLine = { text: string; voice: ElevenLabsVoice };

type GenerateAudioResult = {
  audio_url: string;
  cost: number;
  credits_remaining: number;
};

type AudioHistoryItem = {
  id: string;
  prompt: string;
  audio_url: string;
  model_name: string;
  cost: number;
  created_at: string;
  created_at_label: string;
};

function createInitialLines(): DialogueLine[] {
  return [
    { text: "", voice: "Brian" },
    { text: "", voice: "Adam" },
  ];
}

export function AudioGeneratorClient({
  currentCredits,
  history,
  creditPriceMnt,
  tariffMultiplier,
}: {
  currentCredits: number;
  history: AudioHistoryItem[];
  creditPriceMnt: number;
  tariffMultiplier: number;
}) {
  const [lines, setLines] = useState<DialogueLine[]>(() => createInitialLines());
  const [stability, setStability] = useState(0.5);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateAudioResult | null>(null);
  const router = useRouter();

  function updateLine(index: number, field: keyof DialogueLine, value: string) {
    setLines((prev) =>
      prev.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addLine() {
    if (lines.length >= 20) {
      return;
    }

    setLines((prev) => [...prev, { text: "", voice: "Brian" }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) {
      return;
    }

    setLines((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit() {
    setError(null);
    const availableCredits = result ? result.credits_remaining : currentCredits;
    const filledLines = lines.filter((line) => line.text.trim().length > 0);
    const baseCost = calculateAudioCreditsByCharacterCount(countDialogueCharacters(filledLines));
    const currentCost = calculateFinalCreditCost(baseCost, tariffMultiplier);

    if (filledLines.length === 0) {
      setError("Хамгийн багадаа нэг мөр текст оруулна уу.");
      return;
    }

    if (availableCredits < currentCost) {
      setError(`Кредит хүрэлцэхгүй байна. ${currentCost} кредит шаардлагатай.`);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogue: filledLines, stability }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Алдаа гарлаа.");
        return;
      }

      setResult(payload as GenerateAudioResult);
      setLines(createInitialLines());
      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setLines(createInitialLines());
    setResult(null);
    setError(null);
  }

  const creditsRemaining = result ? result.credits_remaining : currentCredits;
  const filledCount = lines.filter((line) => line.text.trim().length > 0).length;
  const characterCount = countDialogueCharacters(lines);
  const baseCost = calculateAudioCreditsByCharacterCount(characterCount);
  const currentCost = calculateFinalCreditCost(baseCost, tariffMultiplier);
  const currentCostMnt = creditsToMnt(currentCost, creditPriceMnt);
  const hasEnoughCredits = creditsRemaining >= currentCost;

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-0 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
      <div className="border-b border-[rgba(14,42,66,0.08)] bg-white/70 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="space-y-5 p-4 sm:p-6">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,248,252,0.92))] p-5 shadow-[0_20px_45px_rgba(9,38,66,0.06)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-950">Аудио үүсгэх</h1>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">
                      Харилцан ярианы мөрүүдээ оруулаад, дуу хоолойгоо сонгон нэг дор MP3
                      болгож гаргана.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Үлдэгдэл кредит</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{creditsRemaining}</p>
                </div>
              </div>
            </div>

            <GenerationPricingCard
              currentCost={currentCost}
              currentCostDetail={formatMnt(currentCostMnt)}
              description="ElevenLabs Text-to-Speech V3 нь 1,000 тэмдэгт тутамд 14 кредитээр бодогдоно."
              metrics={[
                {
                  label: "Нийт тэмдэгт",
                  value: `${formatCredits(characterCount)}`,
                  detail: "Оруулсан бүх мөрийн нийлбэр",
                },
                {
                  label: "Тариф",
                  value: "14 кредит",
                  detail: `1,000 тэмдэгт тутамд · ${formatMnt(creditsToMnt(14, creditPriceMnt))}`,
                },
                {
                  label: "Идэвхтэй мөр",
                  value: `${filledCount}`,
                  detail: "Хоосон бус мөр",
                },
              ]}
            />

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Харилцан яриа</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Хоолой бүрт тусдаа мөр үүсгээд текстээ бөглөнө үү.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {filledCount}/{lines.length} идэвхтэй
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={`${line.voice}-${index}`}
                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                        {index + 1}
                      </div>
                      <select
                        value={line.voice}
                        onChange={(event) => updateLine(index, "voice", event.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                      >
                        {ELEVENLABS_VOICES.map((voice) => (
                          <option key={voice} value={voice}>
                            {voice}
                          </option>
                        ))}
                      </select>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                          aria-label="Мөр устгах"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <textarea
                      value={line.text}
                      onChange={(event) => updateLine(index, "text", event.target.value)}
                      placeholder={`${index + 1}-р мөрийн текст`}
                      rows={3}
                      className="mt-3 w-full resize-none rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>
                ))}
              </div>

              {lines.length < 20 && (
                <button
                  type="button"
                  onClick={addLine}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-dashed border-cyan-300 bg-cyan-50/70 px-4 py-4 text-sm font-medium text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19" />
                    <line x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                  Мөр нэмэх
                </button>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Тогтвортой байдал</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Дуу хоолойн тогтвортой байдлыг тохируулна.</p>
                </div>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                  {stability.toFixed(1)}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={stability}
                onChange={(event) => setStability(Number(event.target.value))}
                className="mt-4 w-full accent-cyan-600"
              />

              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>Илүү чөлөөтэй</span>
                <span>Илүү тогтвортой</span>
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
                    Аудио боловсруулж байна...
                  </>
                ) : (
                  `Аудио үүсгэх · ${currentCost} кр · ${formatMnt(currentCostMnt)}`
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
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top_right,rgba(132,224,239,0.24),transparent_28%),linear-gradient(180deg,rgba(247,252,255,0.72),rgba(239,248,251,0.95))] p-4 sm:p-6 lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] p-6 text-white sm:p-7">
            <div className="relative z-10 flex h-full flex-col justify-between gap-6">
              <div>
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                  Шууд сонсох
                </span>
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Нэг дэлгэц дээр бичиж, үүсгэж, сонсох</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                  Мобайл хэрэглээнд текстээ зүүн талд бэлдээд, гарсан MP3-аа баруун талд
                  шууд сонсох урсгалтай болгосон.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Мөр</p>
                  <p className="mt-2 text-lg font-semibold">{lines.length}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Идэвхтэй</p>
                  <p className="mt-2 text-lg font-semibold">{filledCount}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Тогтвортой байдал</p>
                  <p className="mt-2 text-lg font-semibold">{stability.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Хэрэглэх зөвлөмж</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>1. Нэг мөрт нэг speaker байлга.</li>
                <li>2. Урт өгүүлбэрийг жижиглэвэл илүү цэвэр гарна.</li>
                <li>3. Дуу хоолойн хурд, амьсгалыг текст дээрээ тусга.</li>
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-cyan-100 bg-cyan-50/70 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Кредит зөвхөн амжилттай үүссэн үед хасагдана.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Алдаа гарвал үлдэгдэлд өөрчлөлт орохгүй.</p>
            </div>
          </aside>
        </div>

        <section className="mt-5 rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_22px_50px_rgba(9,38,66,0.08)] sm:p-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Гаралт</h3>
                <p className="mt-1 text-sm text-slate-500">Үүссэн аудио файл энд шууд тоглогдоно.</p>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">MP3</span>
            </div>

            {isPending ? (
              <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-cyan-200 bg-cyan-50/40 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <h4 className="mt-5 text-xl font-semibold text-slate-950">Аудио үүсгэж байна...</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Хүсэлтийг боловсруулж байна. Дуусмагц тоглуулах болон татах товч гарч ирнэ.
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <audio controls src={result.audio_url} className="w-full" />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">MP3</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{result.cost} кредит</span>
                    </div>
                    <a
                      href={result.audio_url}
                      download
                      className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      Аудио татах
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <h4 className="mt-5 text-xl font-semibold text-slate-950">Таны аудио энд гарна</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Dialogue мөрүүдээ бөглөөд үүсгэхэд бэлэн. Preview хэсгийг mobile дээр том
                  тоглуулагчтай байхаар шинэчилсэн.
                </p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Сүүлийн аудионууд</h3>
                  <p className="mt-1 text-sm text-slate-500">Өмнөх үүсгэлтүүдээ эндээс дахин тоглуулж, татаж болно.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {history.length} бичлэг
                </span>
              </div>

              <div className="space-y-3">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.prompt}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1">{item.created_at_label}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{item.cost} кредит</span>
                        </div>
                      </div>
                      <a
                        href={item.audio_url}
                        download
                        className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                        Татах
                      </a>
                    </div>
                    <audio controls src={item.audio_url} className="mt-4 w-full" />
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
