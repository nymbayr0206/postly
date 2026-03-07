/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Unable to read file."));
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

export function ImageGeneratorClient({ currentCredits }: { currentCredits: number }) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("1:1");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, 3);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!prompt.trim()) { setError("Заавар текст хоосон байна."); return; }
    setIsPending(true);
    try {
      const referenceImages = await Promise.all(files.map((f) => fileToDataUrl(f)));
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, reference_images: referenceImages }),
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error ?? "Алдаа гарлаа."); return; }
      setResult(payload as GenerateResult);
      setPrompt("");
      setFiles([]);
      setPreviews([]);
      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setPrompt(""); setFiles([]); setPreviews([]); setResult(null); setError(null);
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-[420px] xl:w-[480px] bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Credits */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Үлдэгдэл кредит</span>
            <span className="font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              {result ? result.credits_remaining : currentCredits} кредит
            </span>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Заавар текст</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Зурагт юу харагдахыг дэлгэрэнгүй бичээрэй..."
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none transition"
            />
            <p className="text-xs text-gray-400">Зурагт юу харагдахыг дэлгэрэнгүй бичээрэй.</p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Лавлагаа зураг (заавал биш)</label>
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 3}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Зураг нэмэх (хамгийн ихдээ 3)
            </button>
          </div>

          {/* Settings Toggle (mobile) */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700"
            >
              Нэмэлт тохиргоо
              <svg className={`w-4 h-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          {/* Settings */}
          <div className={`space-y-4 ${settingsOpen ? "block" : "hidden lg:block"}`}>
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Харьцаа</label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setAspectRatio(r.value as ImageAspectRatio)}
                    className={`py-2 rounded-lg text-xs font-medium transition ${
                      aspectRatio === r.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
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
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded">Зураг</span>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          {isPending ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center w-full max-w-xl shadow-sm">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
              <p className="font-medium text-gray-900 mb-2">Үүсгэлт явагдаж байна...</p>
              <p className="text-sm text-gray-500">Таны зураг удахгүй бэлэн болно. Түр хүлээнэ үү.</p>
            </div>
          ) : result ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-full max-w-xl shadow-sm">
              <div className="relative group">
                <img src={result.image_url} alt="Generated" className="w-full" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-t-2xl flex items-center justify-center gap-3 p-4">
                  <a
                    href={result.image_url}
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Татах
                  </a>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between border-t border-gray-100">
                <span className="text-sm text-gray-500">{aspectRatio} • PNG</span>
                <a href={result.image_url} download className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Татах
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center w-full max-w-xl shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
              <p className="font-medium text-gray-900 mb-2">Зураг үүсгэгдээгүй байна</p>
              <p className="text-sm text-gray-500">Заавар оруулаад "Үүсгэх" товчийг дарна уу.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
