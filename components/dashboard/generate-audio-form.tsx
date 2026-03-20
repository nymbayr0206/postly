"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { DownloadButton } from "@/components/dashboard/download-button";

import {
  DEFAULT_DIALOGUE_VOICES,
  getElevenLabsVoiceDemoUrl,
  getElevenLabsVoiceLabel,
  ELEVENLABS_VOICE_OPTIONS,
} from "@/lib/audio-models/types";
import type { ElevenLabsVoice } from "@/lib/audio-models/types";
import { creditsToMnt, formatMnt } from "@/lib/generation-pricing";

type DialogueLine = {
  text: string;
  voice: ElevenLabsVoice;
};

type GenerateAudioResult = {
  audio_url: string;
  cost: number;
  credits_remaining: number;
};

export function GenerateAudioForm({ currentCredits, creditPriceMnt }: { currentCredits: number; creditPriceMnt: number }) {
  const [lines, setLines] = useState<DialogueLine[]>([
    { text: "", voice: DEFAULT_DIALOGUE_VOICES.female },
    { text: "", voice: DEFAULT_DIALOGUE_VOICES.male },
  ]);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const filledLines = lines.filter((line) => line.text.trim().length > 0);

    if (filledLines.length === 0) {
      setError("Хамгийн багадаа нэг ярианы мөр шаардлагатай.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogue: filledLines,
          stability,
        }),
      });

      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Аудио үүсгэхэд алдаа гарлаа.");
        return;
      }

      setResult(payload as GenerateAudioResult);
      setLines([
        { text: "", voice: DEFAULT_DIALOGUE_VOICES.female },
        { text: "", voice: DEFAULT_DIALOGUE_VOICES.male },
      ]);
      router.refresh();
    } catch {
      setError("Санамсаргүй алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Аудио үүсгэх</h2>
          <p className="mt-0.5 text-xs text-slate-500">Олон хоолойтой яриаг нэг дор бэлтгэнэ</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          Үлдэгдэл: {formatMnt(creditsToMnt(currentCredits, creditPriceMnt))}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Ярианы мөрүүд</p>
          {lines.map((line, index) => {
            const voiceDemoUrl = getElevenLabsVoiceDemoUrl(line.voice);
            const voiceLabel = getElevenLabsVoiceLabel(line.voice);

            return (
              <div key={`${line.voice}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-start gap-2">
                  <select
                    value={line.voice}
                    onChange={(event) => updateLine(index, "voice", event.target.value)}
                    className="w-40 shrink-0 rounded-xl border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
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
                  <textarea
                    value={line.text}
                    onChange={(event) => updateLine(index, "text", event.target.value)}
                    placeholder={`${index + 1}-р мөр`}
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="mt-1 text-lg leading-none text-slate-400 hover:text-rose-500"
                      aria-label="Мөр устгах"
                    >
                      ×
                    </button>
                  )}
                </div>

                {voiceDemoUrl ? (
                  <div className="mt-3 rounded-xl border border-cyan-100 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Demo хоолой</p>
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                        {voiceLabel}
                      </span>
                    </div>
                    <audio controls preload="none" src={voiceDemoUrl} className="w-full" />
                  </div>
                ) : null}
              </div>
            );
          })}

          {lines.length < 20 && (
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-slate-500 underline hover:text-slate-800"
            >
              + Мөр нэмэх
            </button>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Тогтвортой байдал: {stability.toFixed(1)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={stability}
            onChange={(event) => setStability(Number(event.target.value))}
            className="mt-1 w-full accent-slate-700"
          />
          <span className="mt-0.5 flex justify-between text-xs text-slate-400">
            <span>Илүү чөлөөтэй</span>
            <span>Илүү тогтвортой</span>
          </span>
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? "Үүсгэж байна..." : "Аудио үүсгэх"}
        </button>
      </form>

      {result ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            Аудио амжилттай үүслээ. {formatMnt(creditsToMnt(result.cost, creditPriceMnt))} хасагдлаа.
          </p>
          <audio controls src={result.audio_url} className="w-full" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-emerald-900">
              Үлдэгдэл: {formatMnt(creditsToMnt(result.credits_remaining, creditPriceMnt))}
            </span>
            <DownloadButton url={result.audio_url} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
