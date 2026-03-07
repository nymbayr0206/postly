import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/user-data";

const lessons = [
  {
    title: "Агент эхлэл",
    description: "Postly ашиглан хэрэглэгчийн контент урсгалыг хэрхэн зохион байгуулах вэ.",
  },
  {
    title: "Промпт стратеги",
    description: "Зураг, видео, аудио үүсгэлтэд үр дүнтэй промпт бичих аргачлал.",
  },
  {
    title: "Кредит ба тариф",
    description: "Агент тарифын давуу тал, кредитийн үр ашигтай ашиглалт.",
  },
];

export default async function LessonsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const profile = await getUserProfile(supabase, user.id);

  if (profile.role !== "agent") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Агент хөтөлбөр</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Хичээл</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Агент эрхтэй хэрэглэгчдэд зориулсан сургалтын материал, ажлын аргачлал.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {lessons.map((lesson, index) => (
          <article
            key={lesson.title}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <p className="text-sm text-cyan-700">Хичээл {index + 1}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{lesson.title}</h2>
            <p className="mt-3 text-sm text-slate-600">{lesson.description}</p>
          </article>
        ))}
      </section>

      <Link
        href="/dashboard"
        className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Dashboard руу буцах
      </Link>
    </div>
  );
}
