import Link from "next/link";
import { redirect } from "next/navigation";

import { LessonVideoPlayer } from "@/components/dashboard/lesson-video-player";
import {
  formatLessonFileSize,
  getLessonAudienceLabel,
  getLessonContentTypeLabel,
  getVisibleLessonAudiences,
} from "@/lib/lessons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonRow } from "@/lib/types";
import { ensureUserRecords, getUserProfile } from "@/lib/user-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeLessons(rows: LessonRow[]) {
  return rows.map((lesson) => ({
    ...lesson,
    file_size_bytes:
      lesson.file_size_bytes === null || lesson.file_size_bytes === undefined
        ? null
        : Number(lesson.file_size_bytes),
  }));
}

function isVideoLesson(contentType: string | null) {
  return contentType?.startsWith("video/") ?? false;
}

export default async function LessonsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);
  const profile = await getUserProfile(supabase, user.id);

  if (profile.role === "admin") {
    redirect("/admin/lessons");
  }

  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id,title,description,audience,file_name,file_path,file_size_bytes,content_type,created_by,created_at,updated_at",
    )
    .in("audience", getVisibleLessonAudiences(profile.role))
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Хичээлийн мэдээлэл ачаалж чадсангүй.");
  }

  const lessons = normalizeLessons((data ?? []) as LessonRow[]);
  const intro =
    profile.role === "agent"
      ? "Агентын workflow, борлуулалт, контент үйлдвэрлэлийн материалууд энд шинэчлэгдэж орно."
      : "Платформ дээр хурдан ажиллах, илүү сайн контент гаргах, үндсэн урсгалаа сурахад зориулсан материалууд энд байна.";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-cyan-700">
          {profile.role === "agent" ? "Агент хөтөлбөр" : "Хэрэглэгчийн сургалт"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Хичээл</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">{intro}</p>
      </section>

      {lessons.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Одоогоор хичээл ороогүй байна</h2>
          <p className="mt-2 text-sm text-slate-500">
            Админ шинэ материал upload хийхэд энэ хэсэгт автоматаар харагдана.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson, index) => (
            <article
              key={lesson.id}
              className="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-cyan-700">Хичээл {index + 1}</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{lesson.title}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {getLessonAudienceLabel(lesson.audience)}
                </span>
              </div>

              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                {lesson.description || "Энэ хичээлийг доорх player дээрээс шууд үзнэ."}
              </p>

              {isVideoLesson(lesson.content_type) ? (
                <div className="mt-4">
                  <LessonVideoPlayer lessonId={lesson.id} title={lesson.title} />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Урьдчилан харах боломжгүй файл байна. Видео хичээл энд шууд player-аар харагдана.
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {getLessonContentTypeLabel(lesson.content_type)}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {formatLessonFileSize(lesson.file_size_bytes)}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  {formatDate(lesson.created_at)}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}

      <Link
        href="/dashboard"
        className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Dashboard руу буцах
      </Link>
    </div>
  );
}
