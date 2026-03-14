import Link from "next/link";

import type { CommunityGeneration } from "@/lib/community-gallery";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function aspectFrameClass(aspectRatio: CommunityGeneration["aspect_ratio"]) {
  if (aspectRatio === "4:5") {
    return "aspect-[4/5]";
  }

  if (aspectRatio === "16:9") {
    return "aspect-[16/10]";
  }

  if (aspectRatio === "9:16") {
    return "aspect-[9/14]";
  }

  return "aspect-square";
}

function roleLabel(role: CommunityGeneration["creator_role"]) {
  if (role === "admin") {
    return "Админ";
  }

  if (role === "agent") {
    return "Агент";
  }

  return "Хэрэглэгч";
}

function creatorLabel(item: CommunityGeneration) {
  return item.creator_email ?? "Нууцлагдсан хэрэглэгч";
}

export function CommunityGallerySection({
  items,
  title,
  description,
  emptyMessage,
  viewAllHref,
}: {
  items: CommunityGeneration[];
  title: string;
  description: string;
  emptyMessage: string;
  viewAllHref?: string;
}) {
  return (
    <section className="brand-surface rounded-[1.9rem] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-cyan-700">Community gallery</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
          >
            Бүгдийг харах
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-6 columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/gallery/${item.id}`}
              className="group mb-4 block break-inside-avoid"
            >
              <article className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(12,32,56,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(12,32,56,0.12)]">
                <div className={cx("relative overflow-hidden bg-slate-100", aspectFrameClass(item.aspect_ratio))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.prompt}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,rgba(2,8,23,0),rgba(2,8,23,0.84))]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="inline-flex rounded-full border border-white/10 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                      {item.aspect_ratio}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white">
                      {item.prompt_excerpt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{creatorLabel(item)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{roleLabel(item.creator_role)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{item.created_at_label}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    Дэлгэрэнгүй
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
