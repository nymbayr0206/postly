"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ImageAspectRatio } from "@/lib/types";

const aspectOptions: ImageAspectRatio[] = ["1:1", "4:5", "16:9", "9:16"];

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
        reject(new Error("Файлыг уншиж чадсангүй."));
      }
    };

    reader.onerror = () => reject(new Error("Файлыг уншиж чадсангүй."));
    reader.readAsDataURL(file);
  });
}

export function GenerateImageForm({ currentCredits }: { currentCredits: number }) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("1:1");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const router = useRouter();

  const selectedFileNames = useMemo(() => files.map((file) => file.name), [files]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!prompt.trim()) {
      setError("Промпт оруулна уу.");
      return;
    }

    if (files.length > 3) {
      setError("Хамгийн ихдээ 3 лавлах зураг оруулах боломжтой.");
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" файл 5MB-ээс их байна.`);
        return;
      }
    }

    setIsPending(true);

    try {
      const referenceImages = await Promise.all(files.map((file) => fileToDataUrl(file)));

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          reference_images: referenceImages,
        }),
      });

      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        setError(
          typeof payload.error === "string" ? payload.error : "Зураг үүсгэх үед алдаа гарлаа.",
        );
        return;
      }

      setResult(payload as GenerateResult);
      setPrompt("");
      setFiles([]);
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
        <h2 className="text-xl font-semibold text-slate-900">Зураг үүсгэх</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          Кредит: {currentCredits}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Промпт
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="mt-1 h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            placeholder="Ямар зураг хүсэж байгаагаа дэлгэрэнгүй бичнэ үү"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Харьцаа
          <select
            value={aspectRatio}
            onChange={(event) => setAspectRatio(event.target.value as ImageAspectRatio)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {aspectOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Лавлах зураг (заавал биш, хамгийн ихдээ 3)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files ?? []);
              setFiles(selectedFiles.slice(0, 3));
            }}
            className="mt-1 block w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </label>

        {selectedFileNames.length ? (
          <ul className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
            {selectedFileNames.map((fileName) => (
              <li key={fileName}>{fileName}</li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? "Үүсгэж байна..." : "Зураг үүсгэх"}
        </button>
      </form>

      {result ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            Зураг амжилттай үүслээ. {result.cost} кредит хасагдлаа.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.image_url}
            alt="Үүсгэсэн зураг"
            className="mt-3 w-full rounded-xl border border-emerald-200 object-cover"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-emerald-900">
              Үлдэгдэл: {result.credits_remaining} кредит
            </span>
            <a
              href={result.image_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Татах
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
