import Link from "next/link";
import { redirect } from "next/navigation";

import { ReferralPanel } from "@/components/dashboard/referral-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GenerationRow } from "@/lib/types";
import {
  ensureUserRecords,
  getAgentRequestByUserId,
  getReferralSummary,
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

function QuickCard({
  href,
  title,
  description,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="brand-surface group rounded-[1.75rem] p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(8,30,53,0.08)]"
    >
      <div className={`h-1.5 w-16 rounded-full ${accent}`} />
      <h2 className="mt-5 text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5 text-sm font-semibold text-cyan-700">Нээх</div>
    </Link>
  );
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

  const [profile, wallet, agentRequest, referralSummary, generationsResponse] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getAgentRequestByUserId(supabase, user.id),
    getReferralSummary(supabase, user.id),
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
              {roleLabel(profile.role)}
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Нэг dashboard дотор контентын бүх урсгалаа удирд.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Зураг, видео, аудио үүсгэлт болон кредитийн урсгалууд нэг орчинд байна. Одоо
              өөрийн урилгын линкээ түгээж, бүртгүүлсэн хэрэглэгчдийн кредит цэнэглэлтээс 5%
              урамшуулал авах боломжтой.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/image"
                className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(47,188,230,0.28)]"
              >
                Зураг үүсгэх
              </Link>
              <Link
                href="/dashboard/billing"
                className="rounded-full border border-white/12 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white"
              >
                Кредит авах
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Одоогийн кредит</div>
              <div className="mt-2 text-3xl font-black text-white">{wallet.credits}</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Сүүлийн үүсгэлт</div>
              <div className="mt-2 text-base font-bold text-white">
                {generations[0] ? formatDate(generations[0].created_at) : "Одоогоор түүх алга"}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Хэрэглэгч</div>
              <div className="mt-2 truncate text-base font-bold text-white">{profile.email}</div>
            </div>
          </div>
        </div>
      </section>

      {profile.referral_code ? (
        <ReferralPanel referralCode={profile.referral_code} summary={referralSummary} />
      ) : null}

      {profile.role === "agent" ? (
        <section className="brand-surface rounded-[1.75rem] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-cyan-700">Агентын статус</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">Хичээлийн хэсэг идэвхтэй</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Агентын сургалтын материалууд тань бэлэн байна. Шинэ материалуудаа тэндээс үзнэ үү.
              </p>
            </div>
            <Link
              href="/dashboard/lessons"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Хичээл рүү орох
            </Link>
          </div>
        </section>
      ) : agentRequest ? (
        <section className="brand-surface rounded-[1.75rem] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-600">Агентын хүсэлт</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Төлөв: {requestStatusLabel(agentRequest.status)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Төлбөрийн баримтаа шалгаад, шаардлагатай бол шинэчилж илгээх боломжтой.
              </p>
            </div>
            <Link
              href="/dashboard/agent-onboarding"
              className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white"
            >
              Баталгаажуулалт руу орох
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QuickCard
          href="/dashboard/image"
          title="Зураг үүсгэх"
          description="Сошиал пост, product visual, campaign image үүсгэнэ."
          accent="bg-[linear-gradient(135deg,#84E0EF,#2FBCE6)]"
        />
        <QuickCard
          href="/dashboard/video"
          title="Видео үүсгэх"
          description="Нэг зураг дээр тулгуурлан хөдөлгөөнт богино видео үүсгэнэ."
          accent="bg-[linear-gradient(135deg,#68E3D0,#2FBCE6)]"
        />
        <QuickCard
          href="/dashboard/audio"
          title="Аудио үүсгэх"
          description="Харилцан яриа, voiceover, ad audio-г хурдан бүтээнэ."
          accent="bg-[linear-gradient(135deg,#9EE7F5,#56C9EC)]"
        />
        <QuickCard
          href="/dashboard/billing"
          title="Кредит худалдаж авах"
          description="Багц сонгож, шилжүүлгийн баримт илгээн кредитээ цэнэглэнэ."
          accent="bg-[linear-gradient(135deg,#84E0EF,#169FD5)]"
        />
        <QuickCard
          href="/dashboard/history"
          title="Түүх"
          description="Өмнөх бүх зураг, видео, аудио үүсгэлтээ нэг дороос харна."
          accent="bg-[linear-gradient(135deg,#B0EEF7,#68D4ED)]"
        />
        {profile.role === "agent" ? (
          <QuickCard
            href="/dashboard/lessons"
            title="Хичээл"
            description="Агентуудад зориулсан сургалт, ашиглах аргачлалуудыг үзнэ."
            accent="bg-[linear-gradient(135deg,#72E4E9,#2FBCE6)]"
          />
        ) : (
          <QuickCard
            href="/dashboard/settings"
            title="Тохиргоо"
            description="Данс, мэдэгдэл, хэрэглэгчийн тохиргоогоо эндээс удирдана."
            accent="bg-[linear-gradient(135deg,#84E0EF,#42C7EA)]"
          />
        )}
      </section>

      <section className="brand-surface rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-500">Сүүлийн үүсгэлтүүд</div>
            <h2 className="mt-1 text-xl font-black text-slate-950">Сүүлийн 5 зураг</h2>
          </div>
          <Link href="/dashboard/history" className="text-sm font-semibold text-cyan-700">
            Бүгдийг харах
          </Link>
        </div>

        {generations.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
            Одоогоор үүсгэсэн зураг алга байна.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {generations.map((generation) => (
              <div
                key={generation.id}
                className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-950">{generation.prompt}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {generation.cost} кредит · {formatDate(generation.created_at)}
                    </div>
                  </div>
                  <a
                    href={generation.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Нээх
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
