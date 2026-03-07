import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GenerationRow } from "@/lib/types";
import {
  ensureUserRecords,
  getAgentRequestByUserId,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleLabel(role: "agent" | "user" | "admin") {
  if (role === "admin") {
    return "Админ";
  }

  if (role === "agent") {
    return "Агент";
  }

  return "Хэрэглэгч";
}

function requestStatusLabel(status: "pending" | "approved" | "rejected") {
  if (status === "approved") {
    return "Зөвшөөрсөн";
  }

  if (status === "rejected") {
    return "Татгалзсан";
  }

  return "Хүлээгдэж буй";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);

  const [profile, wallet, agentRequest, generationsResponse] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getAgentRequestByUserId(supabase, user.id),
    supabase
      .from("generations")
      .select("id,user_id,model_name,prompt,aspect_ratio,cost,image_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (generationsResponse.error) {
    throw new Error(generationsResponse.error.message);
  }

  const generations = (generationsResponse.data ?? []) as GenerationRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Тавтай морил</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">{profile.email}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Эрх: <span className="font-medium text-slate-900">{roleLabel(profile.role)}</span>
            </p>
          </div>

          {profile.role === "admin" ? (
            <Link
              href="/admin"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Админ самбар
            </Link>
          ) : null}
        </div>
      </section>

      {profile.role === "agent" ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">Агент эрх идэвхтэй</h2>
              <p className="mt-1 text-sm text-emerald-800">
                Танд агентын `Хичээл` хэсэг нээгдсэн. Шинэ материалуудаа тэндээс үзнэ үү.
              </p>
            </div>
            <Link
              href="/dashboard/lessons"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Хичээл рүү орох
            </Link>
          </div>
        </section>
      ) : agentRequest ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Агент хүсэлт бүртгэлтэй</h2>
              <p className="mt-1 text-sm text-amber-800">
                Төлөв: {requestStatusLabel(agentRequest.status)}. Төлбөрийн баримтаа шалгаж, шаардлагатай бол
                шинэчилж илгээх боломжтой.
              </p>
            </div>
            <Link
              href="/dashboard/agent-onboarding"
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Агент баталгаажуулалт
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Одоогийн кредит</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{wallet.credits}</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Сүүлийн үүсгэлтүүд</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{generations.length}</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Сүүлд хийсэн</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {generations[0] ? formatDate(generations[0].created_at) : "Одоогоор түүх алга"}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/dashboard/image"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Зураг үүсгэх</h2>
          <p className="mt-2 text-sm text-slate-600">NanoBanana-аар шинэ зураг үүсгэнэ.</p>
        </Link>
        <Link
          href="/dashboard/video"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Зургаас видео</h2>
          <p className="mt-2 text-sm text-slate-600">Нэг зургаас AI видео үүсгэнэ.</p>
        </Link>
        <Link
          href="/dashboard/audio"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Аудио үүсгэх</h2>
          <p className="mt-2 text-sm text-slate-600">Текстээ дуу болгон хөрвүүлнэ.</p>
        </Link>
        {profile.role === "agent" ? (
          <Link
            href="/dashboard/lessons"
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">Хичээл</h2>
            <p className="mt-2 text-sm text-slate-600">Агентуудад зориулсан сургалтын материал үзнэ.</p>
          </Link>
        ) : null}
        {agentRequest ? (
          <Link
            href="/dashboard/agent-onboarding"
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">Агент баталгаажуулалт</h2>
            <p className="mt-2 text-sm text-slate-600">Төлбөрийн баримт болон хүсэлтийн төлөвөө шалгана.</p>
          </Link>
        ) : null}
        <Link
          href="/dashboard/history"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Түүх</h2>
          <p className="mt-2 text-sm text-slate-600">Өмнөх үүсгэсэн контентуудаа харна.</p>
        </Link>
        <Link
          href="/dashboard/billing"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Кредит худалдаж авах</h2>
          <p className="mt-2 text-sm text-slate-600">Багц сонгож төлбөрийн баримт илгээн кредит авна.</p>
        </Link>
        <Link
          href="/dashboard/settings"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Тохиргоо</h2>
          <p className="mt-2 text-sm text-slate-600">Данс болон мэдэгдлийн тохиргоогоо удирдана.</p>
        </Link>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Сүүлийн үүсгэлтүүд</h2>
          <Link href="/dashboard/history" className="text-sm font-medium text-cyan-700 hover:text-cyan-600">
            Бүгдийг харах
          </Link>
        </div>

        {generations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Одоогоор үүсгэлт алга.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {generations.map((generation) => (
              <div
                key={generation.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{generation.prompt}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {generation.model_name} · {generation.cost} кредит · {formatDate(generation.created_at)}
                  </p>
                </div>

                <a
                  href={generation.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Нээх
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
