"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GenerationPricingCard } from "@/components/dashboard/generation-pricing-card";
import {
  DEFAULT_DIALOGUE_VOICES,
  getElevenLabsVoiceDemoUrl,
  getElevenLabsVoiceLabel,
  ELEVENLABS_VOICE_OPTIONS,
} from "@/lib/audio-models/types";
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
    { text: "", voice: DEFAULT_DIALOGUE_VOICES.female },
    { text: "", voice: DEFAULT_DIALOGUE_VOICES.male },
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

    setLines((prev) => [...prev, { text: "", voice: DEFAULT_DIALOGUE_VOICES.female }]);
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
      setError("Ð¥Ð°Ð¼Ð³Ð¸Ð¹Ð½ Ð±Ð°Ð³Ð°Ð´Ð°Ð° Ð½ÑÐ³ Ð¼Ó©Ñ€ Ñ‚ÐµÐºÑÑ‚ Ð¾Ñ€ÑƒÑƒÐ»Ð½Ð° ÑƒÑƒ.");
      return;
    }

    if (availableCredits < currentCost) {
      setError(`ÐšÑ€ÐµÐ´Ð¸Ñ‚ Ñ…Ò¯Ñ€ÑÐ»Ñ†ÑÑ…Ð³Ò¯Ð¹ Ð±Ð°Ð¹Ð½Ð°. ${currentCost} ÐºÑ€ÐµÐ´Ð¸Ñ‚ ÑˆÐ°Ð°Ñ€Ð´Ð»Ð°Ð³Ð°Ñ‚Ð°Ð¹.`);
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
        setError(payload.error ?? "ÐÐ»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°.");
        return;
      }

      setResult(payload as GenerateAudioResult);
      setLines(createInitialLines());
      router.refresh();
    } catch {
      setError("ÐÐ»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°. Ð”Ð°Ñ…Ð¸Ð½ Ð¾Ñ€Ð¾Ð»Ð´Ð¾Ð½Ð¾ ÑƒÑƒ.");
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
                    <h1 className="text-2xl font-semibold text-slate-950">ÐÑƒÐ´Ð¸Ð¾ Ò¯Ò¯ÑÐ³ÑÑ…</h1>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">
                      Ð¥Ð°Ñ€Ð¸Ð»Ñ†Ð°Ð½ ÑÑ€Ð¸Ð°Ð½Ñ‹ Ð¼Ó©Ñ€Ò¯Ò¯Ð´ÑÑ Ð¾Ñ€ÑƒÑƒÐ»Ð°Ð°Ð´, Ð´ÑƒÑƒ Ñ…Ð¾Ð¾Ð»Ð¾Ð¹Ð³Ð¾Ð¾ ÑÐ¾Ð½Ð³Ð¾Ð½ Ð½ÑÐ³ Ð´Ð¾Ñ€ MP3
                      Ð±Ð¾Ð»Ð³Ð¾Ð¶ Ð³Ð°Ñ€Ð³Ð°Ð½Ð°.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ò®Ð»Ð´ÑÐ³Ð´ÑÐ» ÐºÑ€ÐµÐ´Ð¸Ñ‚</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{creditsRemaining}</p>
                </div>
              </div>
            </div>

            <GenerationPricingCard
              currentCost={currentCost}
              currentCostDetail={formatMnt(currentCostMnt)}
              description="ElevenLabs Text-to-Speech V3 Ð½ÑŒ 1,000 Ñ‚ÑÐ¼Ð´ÑÐ³Ñ‚ Ñ‚ÑƒÑ‚Ð°Ð¼Ð´ 14 ÐºÑ€ÐµÐ´Ð¸Ñ‚ÑÑÑ€ Ð±Ð¾Ð´Ð¾Ð³Ð´Ð¾Ð½Ð¾."
              metrics={[
                {
                  label: "ÐÐ¸Ð¹Ñ‚ Ñ‚ÑÐ¼Ð´ÑÐ³Ñ‚",
                  value: `${formatCredits(characterCount)}`,
                  detail: "ÐžÑ€ÑƒÑƒÐ»ÑÐ°Ð½ Ð±Ò¯Ñ… Ð¼Ó©Ñ€Ð¸Ð¹Ð½ Ð½Ð¸Ð¹Ð»Ð±ÑÑ€",
                },
                {
                  label: "Ð¢Ð°Ñ€Ð¸Ñ„",
                  value: "14 ÐºÑ€ÐµÐ´Ð¸Ñ‚",
                  detail: `1,000 Ñ‚ÑÐ¼Ð´ÑÐ³Ñ‚ Ñ‚ÑƒÑ‚Ð°Ð¼Ð´ Â· ${formatMnt(creditsToMnt(14, creditPriceMnt))}`,
                },
                {
                  label: "Ð˜Ð´ÑÐ²Ñ…Ñ‚ÑÐ¹ Ð¼Ó©Ñ€",
                  value: `${filledCount}`,
                  detail: "Ð¥Ð¾Ð¾ÑÐ¾Ð½ Ð±ÑƒÑ Ð¼Ó©Ñ€",
                },
              ]}
            />

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Ð¥Ð°Ñ€Ð¸Ð»Ñ†Ð°Ð½ ÑÑ€Ð¸Ð°</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Ð¥Ð¾Ð¾Ð»Ð¾Ð¹ Ð±Ò¯Ñ€Ñ‚ Ñ‚ÑƒÑÐ´Ð°Ð° Ð¼Ó©Ñ€ Ò¯Ò¯ÑÐ³ÑÑÐ´ Ñ‚ÐµÐºÑÑ‚ÑÑ Ð±Ó©Ð³Ð»Ó©Ð½Ó© Ò¯Ò¯.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {filledCount}/{lines.length} Ð¸Ð´ÑÐ²Ñ…Ñ‚ÑÐ¹
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {lines.map((line, index) => {
                  const voiceDemoUrl = getElevenLabsVoiceDemoUrl(line.voice);
                  const voiceLabel = getElevenLabsVoiceLabel(line.voice);

                  return (
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
                          {(["Эмэгтэй", "Эрэгтэй"] as const).map((group) => (
                            <optgroup key={group} label={group}>
                              {ELEVENLABS_VOICE_OPTIONS.filter((voice) => voice.group === group).map((voice) => (
                                <option key={voice.id} value={voice.id}>
                                  {voice.label}
                                </option>
                              ))}
                            </optgroup>
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

                      {voiceDemoUrl ? (
                        <div className="mt-3 rounded-[1rem] border border-cyan-100 bg-white/80 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                              Demo хоолой
                            </p>
                            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                              {voiceLabel}
                            </span>
                          </div>
                          <audio controls preload="none" src={voiceDemoUrl} className="w-full" />
                        </div>
                      ) : null}

                      <textarea
                        value={line.text}
                        onChange={(event) => updateLine(index, "text", event.target.value)}
                        placeholder={`${index + 1}-р мөрийн текст`}
                        rows={3}
                        className="mt-3 w-full resize-none rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                      />
                    </div>
                  );
                })}
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
                  ÐœÓ©Ñ€ Ð½ÑÐ¼ÑÑ…
                </button>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Ð¢Ð¾Ð³Ñ‚Ð²Ð¾Ñ€Ñ‚Ð¾Ð¹ Ð±Ð°Ð¹Ð´Ð°Ð»</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Ð”ÑƒÑƒ Ñ…Ð¾Ð¾Ð»Ð¾Ð¹Ð½ Ñ‚Ð¾Ð³Ñ‚Ð²Ð¾Ñ€Ñ‚Ð¾Ð¹ Ð±Ð°Ð¹Ð´Ð»Ñ‹Ð³ Ñ‚Ð¾Ñ…Ð¸Ñ€ÑƒÑƒÐ»Ð½Ð°.</p>
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
                <span>Ð˜Ð»Ò¯Ò¯ Ñ‡Ó©Ð»Ó©Ó©Ñ‚ÑÐ¹</span>
                <span>Ð˜Ð»Ò¯Ò¯ Ñ‚Ð¾Ð³Ñ‚Ð²Ð¾Ñ€Ñ‚Ð¾Ð¹</span>
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
                    ÐÑƒÐ´Ð¸Ð¾ Ð±Ð¾Ð»Ð¾Ð²ÑÑ€ÑƒÑƒÐ»Ð¶ Ð±Ð°Ð¹Ð½Ð°...
                  </>
                ) : (
                  `ÐÑƒÐ´Ð¸Ð¾ Ò¯Ò¯ÑÐ³ÑÑ… Â· ${currentCost} ÐºÑ€ Â· ${formatMnt(currentCostMnt)}`
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
                ÐšÑ€ÐµÐ´Ð¸Ñ‚ Ñ…Ò¯Ñ€ÑÐ»Ñ†ÑÑ…Ð³Ò¯Ð¹ Ð±Ð°Ð¹Ð½Ð°. Ð”Ð¾Ð¾Ð´ Ñ‚Ð°Ð» Ð½ÑŒ {currentCost} ÐºÑ€ÐµÐ´Ð¸Ñ‚ Ð±ÑƒÑŽÑƒ {formatMnt(currentCostMnt)} ÑˆÐ°Ð°Ñ€Ð´Ð»Ð°Ð³Ð°Ñ‚Ð°Ð¹.
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
                  Ð¨ÑƒÑƒÐ´ ÑÐ¾Ð½ÑÐ¾Ñ…
                </span>
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">ÐÑÐ³ Ð´ÑÐ»Ð³ÑÑ† Ð´ÑÑÑ€ Ð±Ð¸Ñ‡Ð¸Ð¶, Ò¯Ò¯ÑÐ³ÑÐ¶, ÑÐ¾Ð½ÑÐ¾Ñ…</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                  ÐœÐ¾Ð±Ð°Ð¹Ð» Ñ…ÑÑ€ÑÐ³Ð»ÑÑÐ½Ð´ Ñ‚ÐµÐºÑÑ‚ÑÑ Ð·Ò¯Ò¯Ð½ Ñ‚Ð°Ð»Ð´ Ð±ÑÐ»Ð´ÑÑÐ´, Ð³Ð°Ñ€ÑÐ°Ð½ MP3-Ð°Ð° Ð±Ð°Ñ€ÑƒÑƒÐ½ Ñ‚Ð°Ð»Ð´
                  ÑˆÑƒÑƒÐ´ ÑÐ¾Ð½ÑÐ¾Ñ… ÑƒÑ€ÑÐ³Ð°Ð»Ñ‚Ð°Ð¹ Ð±Ð¾Ð»Ð³Ð¾ÑÐ¾Ð½.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">ÐœÓ©Ñ€</p>
                  <p className="mt-2 text-lg font-semibold">{lines.length}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Ð˜Ð´ÑÐ²Ñ…Ñ‚ÑÐ¹</p>
                  <p className="mt-2 text-lg font-semibold">{filledCount}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Ð¢Ð¾Ð³Ñ‚Ð²Ð¾Ñ€Ñ‚Ð¾Ð¹ Ð±Ð°Ð¹Ð´Ð°Ð»</p>
                  <p className="mt-2 text-lg font-semibold">{stability.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-[1.75rem] border border-cyan-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ð¥ÑÑ€ÑÐ³Ð»ÑÑ… Ð·Ó©Ð²Ð»Ó©Ð¼Ð¶</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>1. ÐÑÐ³ Ð¼Ó©Ñ€Ñ‚ Ð½ÑÐ³ speaker Ð±Ð°Ð¹Ð»Ð³Ð°.</li>
                <li>2. Ð£Ñ€Ñ‚ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð³ Ð¶Ð¸Ð¶Ð¸Ð³Ð»ÑÐ²ÑÐ» Ð¸Ð»Ò¯Ò¯ Ñ†ÑÐ²ÑÑ€ Ð³Ð°Ñ€Ð½Ð°.</li>
                <li>3. Ð”ÑƒÑƒ Ñ…Ð¾Ð¾Ð»Ð¾Ð¹Ð½ Ñ…ÑƒÑ€Ð´, Ð°Ð¼ÑŒÑÐ³Ð°Ð»Ñ‹Ð³ Ñ‚ÐµÐºÑÑ‚ Ð´ÑÑÑ€ÑÑ Ñ‚ÑƒÑÐ³Ð°.</li>
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
                <p className="mt-1 text-sm text-slate-500">Ò®Ò¯ÑÑÑÐ½ Ð°ÑƒÐ´Ð¸Ð¾ Ñ„Ð°Ð¹Ð» ÑÐ½Ð´ ÑˆÑƒÑƒÐ´ Ñ‚Ð¾Ð³Ð»Ð¾Ð³Ð´Ð¾Ð½Ð¾.</p>
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
                <h4 className="mt-5 text-xl font-semibold text-slate-950">ÐÑƒÐ´Ð¸Ð¾ Ò¯Ò¯ÑÐ³ÑÐ¶ Ð±Ð°Ð¹Ð½Ð°...</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Ð¥Ò¯ÑÑÐ»Ñ‚Ð¸Ð¹Ð³ Ð±Ð¾Ð»Ð¾Ð²ÑÑ€ÑƒÑƒÐ»Ð¶ Ð±Ð°Ð¹Ð½Ð°. Ð”ÑƒÑƒÑÐ¼Ð°Ð³Ñ† Ñ‚Ð¾Ð³Ð»ÑƒÑƒÐ»Ð°Ñ… Ð±Ð¾Ð»Ð¾Ð½ Ñ‚Ð°Ñ‚Ð°Ñ… Ñ‚Ð¾Ð²Ñ‡ Ð³Ð°Ñ€Ñ‡ Ð¸Ñ€Ð½Ñ.
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
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{result.cost} ÐºÑ€ÐµÐ´Ð¸Ñ‚</span>
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
                      ÐÑƒÐ´Ð¸Ð¾ Ñ‚Ð°Ñ‚Ð°Ñ…
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
                <h4 className="mt-5 text-xl font-semibold text-slate-950">Ð¢Ð°Ð½Ñ‹ Ð°ÑƒÐ´Ð¸Ð¾ ÑÐ½Ð´ Ð³Ð°Ñ€Ð½Ð°</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Dialogue Ð¼Ó©Ñ€Ò¯Ò¯Ð´ÑÑ Ð±Ó©Ð³Ð»Ó©Ó©Ð´ Ò¯Ò¯ÑÐ³ÑÑ…ÑÐ´ Ð±ÑÐ»ÑÐ½. Preview Ñ…ÑÑÐ³Ð¸Ð¹Ð³ mobile Ð´ÑÑÑ€ Ñ‚Ð¾Ð¼
                  Ñ‚Ð¾Ð³Ð»ÑƒÑƒÐ»Ð°Ð³Ñ‡Ñ‚Ð°Ð¹ Ð±Ð°Ð¹Ñ…Ð°Ð°Ñ€ ÑˆÐ¸Ð½ÑÑ‡Ð¸Ð»ÑÑÐ½.
                </p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Ð¡Ò¯Ò¯Ð»Ð¸Ð¹Ð½ Ð°ÑƒÐ´Ð¸Ð¾Ð½ÑƒÑƒÐ´</h3>
                  <p className="mt-1 text-sm text-slate-500">Ó¨Ð¼Ð½Ó©Ñ… Ò¯Ò¯ÑÐ³ÑÐ»Ñ‚Ò¯Ò¯Ð´ÑÑ ÑÐ½Ð´ÑÑÑ Ð´Ð°Ñ…Ð¸Ð½ Ñ‚Ð¾Ð³Ð»ÑƒÑƒÐ»Ð¶, Ñ‚Ð°Ñ‚Ð°Ð¶ Ð±Ð¾Ð»Ð½Ð¾.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {history.length} Ð±Ð¸Ñ‡Ð»ÑÐ³
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
                          <span className="rounded-full bg-slate-100 px-3 py-1">{item.cost} ÐºÑ€ÐµÐ´Ð¸Ñ‚</span>
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
                        Ð¢Ð°Ñ‚Ð°Ñ…
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
