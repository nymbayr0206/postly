import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityGallerySection } from "@/components/dashboard/community-gallery";
import {
  getCommunityGenerationById,
  listRelatedCommunityGenerations,
} from "@/lib/community-gallery";

function roleLabel(role: "agent" | "user" | "admin" | null) {
  if (role === "admin") {
    return "Админ";
  }

  if (role === "agent") {
    return "Агент";
  }

  return "Хэрэглэгч";
}

export default async function CommunityGalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const generation = await getCommunityGenerationById(id);

  if (!generation) {
    notFound();
  }

  const relatedItems = await listRelatedCommunityGenerations(generation.id, 8);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/gallery"
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
        >
          ← Gallery руу буцах
        </Link>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
          {generation.created_at_label}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="brand-surface overflow-hidden rounded-[2rem] p-4 sm:p-6">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generation.image_url} alt={generation.prompt} className="w-full object-cover" />
          </div>
        </section>

        <aside className="brand-surface rounded-[2rem] p-5 sm:p-6">
          <div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            {roleLabel(generation.creator_role)}
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            {generation.creator_email ?? "Нууцлагдсан хэрэглэгч"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Энэ зургийг community feed дээрээс үзэж байна. Доорх хэсэгт яг ямар prompt,
            aspect ratio, model-аар үүссэнийг харууллаа.
          </p>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/85 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Prompt</div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {generation.prompt}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Aspect ratio</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{generation.aspect_ratio}</div>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Зарцуулсан кредит</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{generation.cost}</div>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Үүсгэсэн огноо</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{generation.created_at_label}</div>
            </div>
          </div>

          <a
            href={generation.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Зургийг нээх
          </a>
        </aside>
      </div>

      <CommunityGallerySection
        items={relatedItems}
        title="Төстэй бусад бүтээлүүд"
        description="Community feed дээрх бусад сүүлийн зургууд. Санаа авах эсвэл дараагийн detail рүү орж болно."
        emptyMessage="Одоогоор өөр нэмэлт зураг алга байна."
        viewAllHref="/dashboard/gallery"
      />
    </div>
  );
}
