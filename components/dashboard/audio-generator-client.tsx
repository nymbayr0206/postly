"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ELEVENLABS_VOICES } from "@/lib/audio-models/types";
import type { ElevenLabsVoice } from "@/lib/audio-models/types";

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
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) {
    return `${mins} минутын өмнө`;
  }

  const hours = Math.floor(mins / 60);

  if (hours < 24) {
    return `${hours} цагийн өмнө`;
  }

  return `${Math.floor(hours / 24)} өдрийн өмнө`;
}

export function AudioGeneratorClient({
  currentCredits,
  history,
}: {
  currentCredits: number;
  history: AudioHistoryItem[];
}) {
  const [lines, setLines] = useState<DialogueLine[]>([
    { text: "", voice: "Brian" },
    { text: "", voice: "Adam" },
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
    const filledLines = lines.filter((line) => line.text.trim().length > 0);

    if (filledLines.length === 0) {
      setError("Хамгийн багадаа нэг мөр текст оруулна уу.");
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
      setLines([
        { text: "", voice: "Brian" },
        { text: "", voice: "Adam" },
      ]);
      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setLines([
      { text: "", voice: "Brian" },
      { text: "", voice: "Adam" },
    ]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex w-full flex-shrink-0 flex-col border-b border-gray-200 bg-white lg:w-[480px] lg:border-b-0 lg:border-r xl:w-[540px]">
        <div className="flex-1 space-y-5 overflow-auto p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Үлдэгдэл кредит</span>
            <span className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700">
              {result ? result.credits_remaining : currentCredits} кредит
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">Харилцан яриа</label>
              <span className="text-xs text-gray-400">{lines.length}/20</span>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <select
                    value={line.voice}
                    onChange={(event) => updateLine(index, "voice", event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-purple-400"
                  >
                    {ELEVENLABS_VOICES.map((voice) => (
                      <option key={voice} value={voice}>
                        {voice}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={line.text}
                    onChange={(event) => updateLine(index, "text", event.target.value)}
                    placeholder={`${index + 1}-р мөрийн текст`}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                  />
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {lines.length < 20 && (
              <button
                type="button"
                onClick={addLine}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition hover:border-purple-400 hover:bg-purple-50 hover:text-purple-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                Мөр нэмэх
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">Тогтвортой байдал</label>
              <span className="text-sm font-medium text-purple-700">{stability.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={stability}
              onChange={(event) => setStability(Number(event.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Илүү хувирамтгай</span>
              <span>Илүү тогтвортой</span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 space-y-3 border-t border-gray-200 p-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Аудио үүсгэж байна...
              </>
            ) : (
              "Аудио үүсгэх"
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Цэвэрлэх
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Гаралт</h2>
          <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Аудио</span>
        </div>

        <div className="flex min-h-[400px] items-center justify-center">
          {isPending ? (
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 animate-spin text-green-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="mb-2 font-medium text-gray-900">Аудио үүсгэж байна...</p>
              <p className="text-sm text-gray-500">Түр хүлээнэ үү. Файл удахгүй бэлэн болно.</p>
            </div>
          ) : result ? (
            <div className="w-full max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <audio controls src={result.audio_url} className="w-full" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">MP3 · ElevenLabs</span>
                <a href={result.audio_url} download className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Татах
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="mb-2 font-medium text-gray-900">Одоогоор аудио үүсгээгүй байна</p>
              <p className="text-sm text-gray-500">Харилцан яриагаа оруулаад аудио үүсгэх товчийг дарна уу.</p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Түүх</h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                  <p className="mb-2 line-clamp-2 text-sm font-medium text-gray-900">{item.prompt}</p>
                  <audio controls src={item.audio_url} className="mb-2 w-full" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{timeAgo(item.created_at)} · {item.cost} кр</span>
                    <a href={item.audio_url} download className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      Татах
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
