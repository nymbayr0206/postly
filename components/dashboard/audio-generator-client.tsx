/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ElevenLabsVoice } from "@/lib/audio-models/types";
import { ELEVENLABS_VOICES } from "@/lib/audio-models/types";

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
  if (mins < 60) return `${mins} мин өмнө`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  return `${Math.floor(hours / 24)} өдрийн өмнө`;
}

export function AudioGeneratorClient({ currentCredits, history }: { currentCredits: number; history: AudioHistoryItem[] }) {
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
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  function addLine() {
    if (lines.length >= 20) return;
    setLines((prev) => [...prev, { text: "", voice: "Brian" }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    const filledLines = lines.filter((l) => l.text.trim().length > 0);
    if (filledLines.length === 0) { setError("Хамгийн багадаа нэг мөр бичнэ үү."); return; }
    setIsPending(true);
    try {
      const res = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogue: filledLines, stability }),
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error ?? "Алдаа гарлаа."); return; }
      setResult(payload as GenerateAudioResult);
      setLines([{ text: "", voice: "Brian" }, { text: "", voice: "Adam" }]);
      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setLines([{ text: "", voice: "Brian" }, { text: "", voice: "Adam" }]);
    setResult(null); setError(null);
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-[480px] xl:w-[540px] bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Credits */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Үлдэгдэл кредит</span>
            <span className="font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              {result ? result.credits_remaining : currentCredits} кредит
            </span>
          </div>

          {/* Dialogue Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">Харилцан яриа</label>
              <span className="text-xs text-gray-400">{lines.length}/20</span>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-700 mt-1">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <select
                    value={line.voice}
                    onChange={(e) => updateLine(index, "voice", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-purple-400"
                  >
                    {ELEVENLABS_VOICES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <textarea
                    value={line.text}
                    onChange={(e) => updateLine(index, "text", e.target.value)}
                    placeholder={`${index + 1}-р мөр...`}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 resize-none transition"
                  />
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="mt-1 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
              </div>
            ))}

            {lines.length < 20 && (
              <button
                type="button"
                onClick={addLine}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Мөр нэмэх
              </button>
            )}
          </div>

          {/* Stability Slider */}
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
              onChange={(e) => setStability(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Илүү хувьсамтгай</span>
              <span>Илүү тогтвортой</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-gray-200 space-y-3 flex-shrink-0">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl py-3 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Үүсгэлт явагдаж байна...
              </>
            ) : "Үүсгэх"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="w-full border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Цэвэрлэх
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 bg-gray-50 p-5 overflow-auto">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Гаралт</h2>
          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded">Аудио</span>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          {isPending ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center w-full max-w-xl shadow-sm">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
              <p className="font-medium text-gray-900 mb-2">Аудио үүсгэлт явагдаж байна...</p>
              <p className="text-sm text-gray-500">Та хэсэг хүлээнэ үү.</p>
            </div>
          ) : result ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-xl shadow-sm space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <audio controls src={result.audio_url} className="w-full" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">MP3 • ElevenLabs</span>
                <a
                  href={result.audio_url}
                  download
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Татах
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center w-full max-w-xl shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <p className="font-medium text-gray-900 mb-2">Аудио үүсгэгдээгүй байна</p>
              <p className="text-sm text-gray-500">Харилцан яриа оруулаад "Үүсгэх" товчийг дарна уу.</p>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Түүх</h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{item.prompt}</p>
                  <audio controls src={item.audio_url} className="w-full mb-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{timeAgo(item.created_at)} · {item.cost} кр</span>
                    <a
                      href={item.audio_url}
                      download
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
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
