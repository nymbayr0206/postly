/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { VideoDuration, VideoQuality } from "@/lib/video-models/types";
import { VIDEO_DURATIONS, VIDEO_QUALITIES } from "@/lib/video-models/types";

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
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин өмнө`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  return `${Math.floor(hours / 24)} өдрийн өмнө`;
}

export function VideoGeneratorClient({ currentCredits, history }: { currentCredits: number; history: VideoHistoryItem[] }) {
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    if (selected) setPreview(URL.createObjectURL(selected));
    else setPreview(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setError(null);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!file) { setError("Зураг сонгоно уу."); return; }
    if (!prompt.trim()) { setError("Заавар текст хоосон байна."); return; }
    if (quality === "1080p" && duration === 10) {
      setError("1080p чанар зөвхөн 5 секундийн видеог дэмждэг.");
      return;
    }
    setIsPending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload-image", { method: "POST", body: form });
      const uploadPayload = await uploadRes.json();
      if (!uploadRes.ok) { setError(uploadPayload.error ?? "Зураг оруулахад алдаа гарлаа."); return; }
      const imageUrl = uploadPayload.url as string;
      const genRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_url: imageUrl, duration, quality }),
      });
      const genPayload = await genRes.json();
      if (!genRes.ok) { setError(genPayload.error ?? "Видео үүсгэхэд алдаа гарлаа."); return; }
      setResult(genPayload as GenerateVideoResult);
      setPrompt(""); setFile(null); setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setPrompt(""); setFile(null); setPreview(null); setResult(null); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Лавлагаа зураг</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !preview && fileInputRef.current?.click()}
              className={`relative rounded-xl border-2 border-dashed transition cursor-pointer min-h-[160px] flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? "border-purple-400 bg-purple-50"
                  : preview
                  ? "border-gray-200 bg-gray-50 cursor-default"
                  : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50"
              }`}
            >
              {preview ? (
                <>
                  <img src={preview} alt="" className="max-h-48 max-w-full rounded-lg object-contain" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                  >×</button>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  <p className="text-sm text-gray-600">Зураг чирж оруулах эсвэл дарна уу</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP · хамгийн ихдээ 10MB</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
            {file && <p className="text-xs text-gray-500">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Заавар текст</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Видеод юу болохыг тайлбарлана уу..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none transition"
            />
          </div>

          {/* Duration & Quality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Үргэлжлэх хугацаа</label>
              <div className="flex gap-2">
                {VIDEO_DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                      duration === d ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Чанар</label>
              <div className="flex gap-2">
                {VIDEO_QUALITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    disabled={q === "1080p" && duration === 10}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                      quality === q ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } disabled:opacity-40`}
                  >
                    {q}
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
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">Видео</span>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          {isPending ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center w-full max-w-xl shadow-sm">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
              <p className="font-medium text-gray-900 mb-2">Видео үүсгэлт явагдаж байна...</p>
              <p className="text-sm text-gray-500">Энэ процесс хэдэн минут болж болно. Түр хүлээнэ үү.</p>
            </div>
          ) : result ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-full max-w-xl shadow-sm">
              <video controls src={result.video_url} className="w-full" />
              <div className="p-4 flex items-center justify-between border-t border-gray-100">
                <span className="text-sm text-gray-500">{duration}s • {quality}</span>
                <a
                  href={result.video_url}
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
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              </div>
              <p className="font-medium text-gray-900 mb-2">Видео үүсгэгдээгүй байна</p>
              <p className="text-sm text-gray-500">Зураг болон заавар оруулаад "Үүсгэх" товчийг дарна уу.</p>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Түүх</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {history.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gray-100 relative">
                    <video
                      src={item.video_url}
                      poster={item.image_url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{item.prompt}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>{timeAgo(item.created_at)}</span>
                      <span>{item.duration}с · {item.quality} · {item.cost} кр</span>
                    </div>
                    <a
                      href={item.video_url}
                      download
                      className="flex items-center justify-center gap-1 w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
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
