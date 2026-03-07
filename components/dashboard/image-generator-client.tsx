"use client";

import { useRef, useState } from "react";
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

      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Зургийг уншиж чадсангүй."));
      }
    };
    reader.onerror = () => reject(new Error("Зургийг уншиж чадсангүй."));
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(0, 3);
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setPreviews((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!prompt.trim()) {
      setError("Промпт хоосон байна.");
      return;
    }

    setIsPending(true);

    try {
      const referenceImages = await Promise.all(files.map((file) => fileToDataUrl(file)));
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          reference_images: referenceImages,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Алдаа гарлаа.");
        return;
      }

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
    setPrompt("");
    setFiles([]);
    setPreviews([]);
    setResult(null);
    setError(null);
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
            <label className="block text-sm font-medium text-gray-900">Промпт</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Үүсгэх зураг ямар байхыг дэлгэрэнгүй бичнэ үү..."
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
            <p className="text-xs text-gray-400">
              Дүрслэл, орчин, өнгө, өнцөг, гэрэлтүүлгээ тодорхой бичих тусам сайн.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              Лавлах зураг (заавал биш)
            </label>
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, index) => (
                  <div key={src} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full rounded-lg border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 3}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-600 transition hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              Зураг нэмэх (хамгийн ихдээ 3)
            </button>
          </div>

          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
            >
              Нэмэлт тохиргоо
              <svg className={`h-4 w-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          <div className={`space-y-4 ${settingsOpen ? "block" : "hidden lg:block"}`}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Харьцаа</label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => setAspectRatio(ratio.value as ImageAspectRatio)}
                    className={`rounded-lg py-2 text-xs font-medium transition ${
                      aspectRatio === ratio.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {ratio.label}
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
                Зураг үүсгэж байна...
              </>
            ) : (
              "Зураг үүсгэх"
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
          <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Зураг</span>
        </div>

        <div className="flex min-h-[400px] items-center justify-center">
          {isPending ? (
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <svg className="h-8 w-8 animate-spin text-purple-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="mb-2 font-medium text-gray-900">Зураг үүсгэж байна...</p>
              <p className="text-sm text-gray-500">Түр хүлээнэ үү. Таны зураг удахгүй бэлэн болно.</p>
            </div>
          ) : result ? (
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.image_url} alt="Үүсгэсэн зураг" className="w-full" />
                <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-t-2xl bg-black/50 p-4 opacity-0 transition group-hover:opacity-100">
                  <a
                    href={result.image_url}
                    download
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    Татах
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 p-4">
                <span className="text-sm text-gray-500">{aspectRatio} · PNG</span>
                <a href={result.image_url} download className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
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
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <p className="mb-2 font-medium text-gray-900">Одоогоор зураг үүсгээгүй байна</p>
              <p className="text-sm text-gray-500">Промптоо оруулаад зураг үүсгэх товчийг дарна уу.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
