import Link from "next/link";
import { redirect } from "next/navigation";

import { CommunityGallerySection } from "@/components/dashboard/community-gallery";
import { listCommunityGenerations } from "@/lib/community-gallery";
import { formatCredits } from "@/lib/generation-pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GenerationRow } from "@/lib/types";
import {
  ensureUserRecords,
  getAgentRequestByUserId,
  getUserProfile,
} from "@/lib/user-data";

const TRAINED_CHATGPT_URL =
  "https://chatgpt.com/g/g-69b6e113f94481918f10085023c5f44d-postly-content-zovlokh";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

  const [profile, agentRequest, generationsResponse, communityGenerations] = await Promise.all([
    getUserProfile(supabase, user.id),
    getAgentRequestByUserId(supabase, user.id),
    supabase
      .from("generations")
      .select("id,user_id,model_name,prompt,aspect_ratio,cost,image_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    listCommunityGenerations(16),
  ]);

  if (generationsResponse.error) {
    throw new Error(generationsResponse.error.message);
  }

  const generations = (generationsResponse.data ?? []) as GenerationRow[];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/dashboard/image"
            className="flex min-h-[4.25rem] items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-5 py-4 text-base font-black text-slate-950 shadow-[0_18px_40px_rgba(47,188,230,0.28)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Зураг үүсгэх
          </Link>
          <Link
            href="/dashboard/billing"
            className="flex min-h-[4.25rem] items-center justify-center rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/[0.12]"
          >
            Кредит авах
          </Link>
          <Link
            href={TRAINED_CHATGPT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[4.25rem] items-center justify-center rounded-[1.4rem] border border-cyan-300/30 bg-cyan-300/12 px-5 py-4 text-base font-semibold text-cyan-100 transition-colors duration-200 hover:bg-cyan-300/16 sm:col-span-2 xl:col-span-1"
          >
            Сургагдсан ChatGPT
          </Link>
        </div>
      </section>

      {profile.role !== "admin" ? (
        <section className="brand-surface rounded-[1.75rem] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-cyan-700">Хичээлийн сан</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {profile.role === "agent" ? "Агентийн хичээлүүд бэлэн байна" : "Танд зориулсан хичээлүүд орсон"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {profile.role === "agent"
                  ? "Агентийн workflow, борлуулалт, контент үйлдвэрлэлийн материалуудаа нэг дороос үзнэ."
                  : "Платформ дээр хурдан ажиллах, контент үүсгэх үндсэн урсгалаа сурахад зориулсан материалуудаа эндээс нээнэ."}
              </p>
            </div>
            <Link
              href="/dashboard/lessons"
              className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_16px_36px_rgba(47,188,230,0.22)]"
            >
              Хичээл рүү орох
            </Link>
          </div>
        </section>
      ) : null}

      {profile.role !== "agent" && agentRequest ? (
        <section className="brand-surface rounded-[1.75rem] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-600">Агентийн хүсэлт</div>
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

      <CommunityGallerySection
        items={communityGenerations}
        title="Хэрэглэгчдийн нээлттэй зургийн урсгал"
        description="Бүх хэрэглэгчийн сүүлийн бүтээлүүдийг Pinterest маягийн урсгалаар хараад, хүссэн зураг дээрээ дарж prompt болон creator detail рүү орно."
        emptyMessage="Одоогоор community gallery хоосон байна."
        viewAllHref="/dashboard/gallery"
      />

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
                      {formatCredits(generation.cost)} кредит · {formatDate(generation.created_at)}
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
