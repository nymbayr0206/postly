import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type HistoryItem =
  | {
      type: "image";
      id: string;
      model_name: string;
      prompt: string;
      aspect_ratio: string | null;
      cost: number;
      url: string;
      created_at: string;
    }
  | {
      type: "audio";
      id: string;
      model_name: string;
      prompt: string;
      cost: number;
      url: string;
      created_at: string;
    }
  | {
      type: "video";
      id: string;
      model_name: string;
      prompt: string;
      duration: number;
      quality: string;
      cost: number;
      url: string;
      image_url: string;
      created_at: string;
    };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function TypeBadge({ type }: { type: "image" | "audio" | "video" }) {
  const labels = {
    image: "Зураг",
    audio: "Аудио",
    video: "Видео",
  };
  const colors = {
    image: "border-cyan-200 bg-cyan-50 text-cyan-700",
    audio: "border-slate-200 bg-slate-100 text-slate-700",
    video: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const [imagesRes, audiosRes, videosRes] = await Promise.all([
    supabase
      .from("generations")
      .select("id,model_name,prompt,aspect_ratio,cost,image_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("audio_generations")
      .select("id,model_name,prompt,cost,audio_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("video_generations")
      .select("id,model_name,prompt,duration,quality,cost,video_url,image_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const items: HistoryItem[] = [
    ...(imagesRes.data ?? []).map((row) => ({
      type: "image" as const,
      id: row.id,
      model_name: row.model_name,
      prompt: row.prompt,
      aspect_ratio: row.aspect_ratio ?? null,
      cost: row.cost,
      url: row.image_url,
      created_at: row.created_at,
    })),
    ...(audiosRes.data ?? []).map((row) => ({
      type: "audio" as const,
      id: row.id,
      model_name: row.model_name,
      prompt: row.prompt,
      cost: row.cost,
      url: row.audio_url,
      created_at: row.created_at,
    })),
    ...(videosRes.data ?? []).map((row) => ({
      type: "video" as const,
      id: row.id,
      model_name: row.model_name,
      prompt: row.prompt,
      duration: row.duration,
      quality: row.quality,
      cost: row.cost,
      url: row.video_url,
      image_url: row.image_url,
      created_at: row.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const imageCount = items.filter((item) => item.type === "image").length;
  const audioCount = items.filter((item) => item.type === "audio").length;
  const videoCount = items.filter((item) => item.type === "video").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] p-6 text-white sm:p-8">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
              Generation history
            </span>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Таны үүсгэлтийн түүх</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
              Зураг, видео, аудио бүх үр дүнгээ нэг дэлгэц дээр хянаж, дахин нээж эсвэл татаж болно.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Нийт</p>
              <p className="mt-2 text-3xl font-semibold">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Зураг</p>
              <p className="mt-2 text-3xl font-semibold">{imageCount}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Видео / Аудио</p>
              <p className="mt-2 text-3xl font-semibold">
                {videoCount} / {audioCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="brand-surface rounded-[2rem] p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
            <svg
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-950">Одоогоор түүх хоосон байна</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
            Зураг, видео эсвэл аудио үүсгэсний дараа энд автоматаар нэмэгдэнэ.
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={`${item.type}-${item.id}`}
              className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 shadow-[0_18px_40px_rgba(9,38,66,0.08)] backdrop-blur"
            >
              <div className="relative aspect-video bg-slate-100">
                {item.type === "image" && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.prompt} className="h-full w-full object-cover" />
                  </>
                )}
                {item.type === "video" && (
                  <video
                    src={item.url}
                    poster={item.image_url}
                    controls
                    className="h-full w-full object-cover"
                  />
                )}
                {item.type === "audio" && (
                  <div className="brand-shell brand-grid flex h-full w-full flex-col items-center justify-center gap-4 p-5 text-white">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-cyan-100">
                      <svg
                        className="h-7 w-7"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                    <audio controls src={item.url} className="relative z-10 w-full" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <TypeBadge type={item.type} />
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="space-y-2">
                  <p className="line-clamp-2 text-base font-semibold text-slate-950">{item.prompt}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{formatDate(item.created_at)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">{item.cost} кредит</span>
                    {item.type === "image" && (
                      <span className="rounded-full bg-slate-100 px-3 py-1">{item.aspect_ratio ?? "-"}</span>
                    )}
                    {item.type === "video" && (
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {item.duration} сек · {item.quality}
                      </span>
                    )}
                    {item.type === "audio" && (
                      <span className="rounded-full bg-slate-100 px-3 py-1">{item.model_name}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Харах
                  </a>
                  <a
                    href={item.url}
                    download
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    Татах
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
