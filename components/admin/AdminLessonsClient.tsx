"use client";

import { startTransition, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatLessonFileSize,
  getLessonAudienceLabel,
  getLessonContentTypeLabel,
  LESSON_ALLOWED_MIME_TYPES,
  LESSON_AUDIENCE_OPTIONS,
  LESSON_MAX_SIZE_BYTES,
} from "@/lib/lessons";
import type { LessonRow } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

function parseErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = payload.error;

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return fallback;
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function AdminLessonsClient({ lessons }: { lessons: LessonRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const regularLessons = lessons.filter((lesson) => lesson.audience === "user" || lesson.audience === "all").length;
  const agentLessons = lessons.filter((lesson) => lesson.audience === "agent" || lesson.audience === "all").length;

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/lessons", {
        method: "POST",
        body: formData,
      });
      const payload = await parseJson(response);

      if (!response.ok) {
        setError(parseErrorMessage(payload, "Хичээл upload хийж чадсангүй."));
        setIsUploading(false);
        return;
      }

      formRef.current?.reset();
      setSuccess("Хичээл амжилттай нэмэгдлээ.");
      setIsUploading(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Хичээл upload хийх үед алдаа гарлаа.");
      setIsUploading(false);
    }
  }

  async function handleDelete(lessonId: string) {
    if (deletingLessonId) {
      return;
    }

    const confirmed = window.confirm("Энэ хичээлийг устгах уу?");

    if (!confirmed) {
      return;
    }

    setDeletingLessonId(lessonId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "DELETE",
      });
      const payload = await parseJson(response);

      if (!response.ok) {
        setError(parseErrorMessage(payload, "Хичээл устгаж чадсангүй."));
        setDeletingLessonId(null);
        return;
      }

      setSuccess("Хичээл устгагдлаа.");
      setDeletingLessonId(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Хичээл устгах үед алдаа гарлаа.");
      setDeletingLessonId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Нийт хичээл</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(lessons.length)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Энгийн хэрэглэгчид</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(regularLessons)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Агентууд</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(agentLessons)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Upload limit</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {formatLessonFileSize(LESSON_MAX_SIZE_BYTES)}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Хичээл upload</h1>
          <p className="mt-1 text-sm text-slate-500">
            PDF, document, presentation эсвэл video файл upload хийгээд regular user, agent, эсвэл бүх хэрэглэгчид рүү харуулна.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleUpload} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Гарчиг</span>
              <input
                type="text"
                name="title"
                required
                maxLength={120}
                placeholder="Жишээ: Prompt бичих үндэс"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Хэнд харагдах вэ</span>
              <select
                name="audience"
                defaultValue="user"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              >
                {LESSON_AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Тайлбар</span>
            <textarea
              name="description"
              rows={4}
              maxLength={1000}
              placeholder="Энэ хичээлээр юу сурах, ямар workflow-д хэрэгтэйг товч тайлбарлана."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Файл</span>
            <input
              type="file"
              name="file"
              required
              accept={LESSON_ALLOWED_MIME_TYPES.join(",")}
              className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-cyan-300"
            />
            <p className="mt-2 text-xs text-slate-500">
              Дэмжигдэх төрөл: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, MP4, MOV, WEBM. Дээд хэмжээ{" "}
              {formatLessonFileSize(LESSON_MAX_SIZE_BYTES)}.
            </p>
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Upload хийж байна..." : "Хичээл upload хийх"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Хичээлийн жагсаалт</h2>
          <p className="mt-1 text-sm text-slate-500">Хамгийн сүүлд upload хийсэн файл хамгийн дээр харагдана.</p>
        </div>

        {lessons.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Одоогоор upload хийсэн хичээл алга байна.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-6 py-3 font-medium">Хичээл</th>
                  <th className="px-6 py-3 font-medium">Ангилал</th>
                  <th className="px-6 py-3 font-medium">Файл</th>
                  <th className="px-6 py-3 font-medium">Хэмжээ</th>
                  <th className="px-6 py-3 font-medium">Огноо</th>
                  <th className="px-6 py-3 font-medium">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.id} className="border-b border-slate-100 align-top">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{lesson.title}</div>
                      <div className="mt-1 max-w-[360px] text-sm text-slate-600">
                        {lesson.description || "Тайлбар оруулаагүй"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{getLessonAudienceLabel(lesson.audience)}</td>
                    <td className="px-6 py-4 text-slate-700">
                      <div>{lesson.file_name ?? "-"}</div>
                      <div className="mt-1 text-xs text-slate-400">{getLessonContentTypeLabel(lesson.content_type)}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{formatLessonFileSize(lesson.file_size_bytes)}</td>
                    <td className="px-6 py-4 text-slate-700">{formatDate(lesson.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <a
                          href={`/api/lessons/${lesson.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Нээх
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(lesson.id)}
                          disabled={deletingLessonId === lesson.id}
                          className="inline-flex rounded-lg border border-rose-200 px-3 py-2 font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingLessonId === lesson.id ? "Устгаж байна..." : "Устгах"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
