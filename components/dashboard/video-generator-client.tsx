"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

export function VideoGeneratorClient({
  currentCredits,
  history,
}: {
  currentCredits: number;
  history: VideoHistoryItem[];
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;

    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setError(null);
    }
  }

  async function handleSubmit() {
    setError(null);

    if (!file) {
      setError("Эх зураг сонгоно уу.");
      return;
    }

    if (!prompt.trim()) {
      setError("Промпт хоосон байна.");
      return;
    }

    if (quality === "1080p" && duration === 10) {
      setError("1080p чанар зөвхөн 5 секундын видеод дэмжигдэнэ.");
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
        setError(uploadPayload.error ?? "Зураг оруулахад алдаа гарлаа.");
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
        setError(generatePayload.error ?? "Видео үүсгэхэд алдаа гарлаа.");
        return;
      }

      setResult(generatePayload as GenerateVideoResult);
      setPrompt("");
      setFile(null);
      setPreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  function handleClear() {
    setPrompt("");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex w-full flex-shrink-0 flex-col border-b border-gray-200 bg-white lg:w-[420px] lg:border-b-0 lg:border-r xl:w-[480px]">
        <div className="flex-1 space-y-5 overflow-auto p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Үлдэгдэл кредит</span>
            <span className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700">
              {result ? result.credits_remaining : currentCredits} кредит
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Эх зураг</label>
            <div
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !preview && fileInputRef.current?.click()}
              className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
                isDragging
                  ? "border-purple-400 bg-purple-50"
                  : preview
                    ? "cursor-default border-gray-200 bg-gray-50"
                    : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50"
              }`}
            >
              {preview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="max-h-48 max-w-full rounded-lg object-contain" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                      setPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm text-white hover:bg-red-600"
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <svg className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  <p className="text-sm text-gray-600">Зураг чирж оруулах эсвэл дарж сонгоно уу</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP · хамгийн ихдээ 10MB</p>
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
              <p className="text-xs text-gray-500">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">Промпт</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Видео ямар хөдөлгөөнтэй, ямар орчинтой байхыг тайлбарлана уу..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Үргэлжлэх хугацаа</label>
              <div className="flex gap-2">
                {VIDEO_DURATIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDuration(item)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                      duration === item
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {item} сек
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Чанар</label>
              <div className="flex gap-2">
                {VIDEO_QUALITIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuality(item)}
                    disabled={item === "1080p" && duration === 10}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                      quality === item
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } disabled:opacity-40`}
                  >
                    {item}
                  </button>
                ))}
              </div>
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
                Видео үүсгэж байна...
              </>
            ) : (
              "Видео үүсгэх"
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
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Видео</span>
        </div>

        <div className="flex min-h-[400px] items-center justify-center">
          {isPending ? (
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="mb-2 font-medium text-gray-900">Видео үүсгэж байна...</p>
              <p className="text-sm text-gray-500">Энэ процесс арай удаан үргэлжилж болно. Түр хүлээнэ үү.</p>
            </div>
          ) : result ? (
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <video controls src={result.video_url} className="w-full" />
              <div className="flex items-center justify-between border-t border-gray-100 p-4">
                <span className="text-sm text-gray-500">{duration} сек · {quality}</span>
                <a href={result.video_url} download className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
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
                  <path d="m22 8-6 4 6 4V8z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              </div>
              <p className="mb-2 font-medium text-gray-900">Одоогоор видео үүсгээгүй байна</p>
              <p className="text-sm text-gray-500">Эх зураг болон промптоо оруулаад видео үүсгэх товчийг дарна уу.</p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Түүх</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {history.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md">
                  <div className="relative aspect-video bg-gray-100">
                    <video
                      src={item.video_url}
                      poster={item.image_url}
                      controls
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="mb-1 line-clamp-2 text-sm font-medium text-gray-900">{item.prompt}</p>
                    <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                      <span>{timeAgo(item.created_at)}</span>
                      <span>{item.duration} сек · {item.quality} · {item.cost} кр</span>
                    </div>
                    <a href={item.video_url} download className="flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50">
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
