"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DownloadButton } from "@/components/dashboard/download-button";

import { VIDEO_DURATIONS, VIDEO_QUALITIES } from "@/lib/video-models/types";
import type { VideoDuration, VideoQuality } from "@/lib/video-models/types";
import { creditsToMnt, formatMnt } from "@/lib/generation-pricing";

type GenerateVideoResult = {
  video_url: string;
  cost: number;
  credits_remaining: number;
};

export function GenerateVideoForm({ currentCredits, creditPriceMnt }: { currentCredits: number; creditPriceMnt: number }) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [quality, setQuality] = useState<VideoQuality>("720p");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateVideoResult | null>(null);
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
    const dropped = event.dataTransfer.files?.[0] ?? null;

    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Зураг сонгоно уу.");
      return;
    }

    if (!prompt.trim()) {
      setError("Промпт заавал шаардлагатай.");
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
      const uploadPayload = (await uploadResponse.json()) as Record<string, unknown>;

      if (!uploadResponse.ok) {
        setError(
          typeof uploadPayload.error === "string"
            ? uploadPayload.error
            : "Зураг оруулахад алдаа гарлаа.",
        );
        return;
      }

      const imageUrl = uploadPayload.url as string;

      const generateResponse = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_url: imageUrl, duration, quality }),
      });

      const generatePayload = (await generateResponse.json()) as Record<string, unknown>;

      if (!generateResponse.ok) {
        setError(
          typeof generatePayload.error === "string"
            ? generatePayload.error
            : "Видео үүсгэхэд алдаа гарлаа.",
        );
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
      setError("Санамсаргүй алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Видео үүсгэх</h2>
          <p className="mt-0.5 text-xs text-slate-500">Runway Gen-4 Turbo · Зургаас видео</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          Үлдэгдэл: {formatMnt(creditsToMnt(currentCredits, creditPriceMnt))}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="block text-sm font-medium text-slate-700">
          Лавлах зураг
          <div
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-slate-400 hover:bg-slate-100"
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Урьдчилсан харах" className="max-h-48 rounded-lg object-contain" />
              </>
            ) : (
              <>
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
                  />
                </svg>
                <p className="text-sm text-slate-500">Дарж сонгох эсвэл зураг чирж оруулна уу</p>
                <p className="text-xs text-slate-400">JPG, PNG, WebP · хамгийн ихдээ 10MB</p>
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
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="text-rose-400 hover:text-rose-600"
              >
                Устгах
              </button>
            </div>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Промпт
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Видеонд юу болохыг тайлбарлана уу..."
            rows={3}
            className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-slate-700">
            Үргэлжлэх хугацаа
            <select
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value) as VideoDuration)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              {VIDEO_DURATIONS.map((item) => (
                <option key={item} value={item}>
                  {item} секунд
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Чанар
            <select
              value={quality}
              onChange={(event) => setQuality(event.target.value as VideoQuality)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              {VIDEO_QUALITIES.map((item) => (
                <option
                  key={item}
                  value={item}
                  disabled={item === "1080p" && duration === 10}
                >
                  {item}
                  {item === "1080p" && duration === 10 ? " (зөвхөн 5 сек)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? "Үүсгэж байна... (хэдэн минут үргэлжилж магадгүй)" : "Видео үүсгэх"}
        </button>
      </form>

      {result ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            Видео амжилттай үүслээ. {formatMnt(creditsToMnt(result.cost, creditPriceMnt))} хасагдлаа.
          </p>
          <video controls src={result.video_url} className="w-full rounded-xl border border-emerald-200" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-emerald-900">
              Үлдэгдэл: {formatMnt(creditsToMnt(result.credits_remaining, creditPriceMnt))}
            </span>
            <DownloadButton url={result.video_url} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
