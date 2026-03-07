"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { VideoDuration, VideoQuality } from "@/lib/video-models/types";
import { VIDEO_DURATIONS, VIDEO_QUALITIES } from "@/lib/video-models/types";

type GenerateVideoResult = {
  video_url: string;
  cost: number;
  credits_remaining: number;
};

export function GenerateVideoForm({ currentCredits }: { currentCredits: number }) {
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);

    if (selected) {
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0] ?? null;
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

    if (!file) { setError("Please select an image."); return; }
    if (!prompt.trim()) { setError("Prompt is required."); return; }
    if (quality === "1080p" && duration === 10) {
      setError("1080p quality only supports 5-second videos.");
      return;
    }

    setIsPending(true);
    try {
      // Step 1: Upload image → get public URL
      const form = new FormData();
      form.append("file", file);

      const uploadRes = await fetch("/api/upload-image", { method: "POST", body: form });
      const uploadPayload = (await uploadRes.json()) as Record<string, unknown>;

      if (!uploadRes.ok) {
        setError(typeof uploadPayload.error === "string" ? uploadPayload.error : "Image upload failed.");
        return;
      }

      const imageUrl = uploadPayload.url as string;

      // Step 2: Generate video
      const genRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_url: imageUrl, duration, quality }),
      });

      const genPayload = (await genRes.json()) as Record<string, unknown>;

      if (!genRes.ok) {
        setError(typeof genPayload.error === "string" ? genPayload.error : "Video generation failed.");
        return;
      }

      setResult(genPayload as unknown as GenerateVideoResult);
      setPrompt("");
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Generate Video</h2>
          <p className="text-xs text-slate-500 mt-0.5">Runway Gen-4 Turbo · Image to Video</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          Credits: {currentCredits}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image upload area */}
        <div className="block text-sm font-medium text-slate-700">
          Reference Image
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 transition flex flex-col items-center justify-center gap-2 p-4 min-h-[140px]"
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 rounded-lg object-contain"
              />
            ) : (
              <>
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-500">Click or drag & drop an image</p>
                <p className="text-xs text-slate-400">JPG, PNG, WebP · max 10MB</p>
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
              <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-rose-400 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Prompt */}
        <label className="block text-sm font-medium text-slate-700">
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what should happen in the video..."
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 resize-none"
            required
          />
        </label>

        {/* Duration & Quality */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-slate-700">
            Duration
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as VideoDuration)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              {VIDEO_DURATIONS.map((d) => (
                <option key={d} value={d}>{d} seconds</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Quality
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as VideoQuality)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              {VIDEO_QUALITIES.map((q) => (
                <option key={q} value={q} disabled={q === "1080p" && duration === 10}>
                  {q}{q === "1080p" && duration === 10 ? " (5s only)" : ""}
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
          {isPending ? "Generating… (may take a few minutes)" : "Generate Video"}
        </button>
      </form>

      {result ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <p className="text-sm text-emerald-800">
            Video generated successfully. {result.cost} credits deducted.
          </p>
          <video controls src={result.video_url} className="w-full rounded-xl border border-emerald-200" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-emerald-900">
              Credits remaining: {result.credits_remaining}
            </span>
            <a
              href={result.video_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Download
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
