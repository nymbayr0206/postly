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
    image: "bg-blue-100 text-blue-700",
    audio: "bg-purple-100 text-purple-700",
    video: "bg-green-100 text-green-700",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[type]}`}>
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

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">Түүх</h1>
        <p className="text-sm text-gray-600">Таны үүсгэсэн бүх зураг, видео, аудио энд байна.</p>
      </div>

      <div className="mb-6 text-sm text-gray-500">{items.length} бичлэг олдлоо</div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
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
          <p className="mb-2 font-medium text-gray-900">Одоогоор түүх хоосон байна</p>
          <p className="text-sm text-gray-500">
            Зураг, видео эсвэл аудио үүсгэсний дараа энд харагдана.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-video bg-gray-100">
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
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
                      <svg
                        className="h-7 w-7 text-purple-600"
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
                    <audio controls src={item.url} className="w-full" />
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  <TypeBadge type={item.type} />
                </div>
              </div>

              <div className="p-4">
                <p className="mb-2 line-clamp-2 text-sm font-medium text-gray-900">{item.prompt}</p>
                <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{formatDate(item.created_at)}</span>
                  {item.type === "image" && <span>{item.aspect_ratio ?? "-"}</span>}
                  {item.type === "video" && <span>{item.duration} сек · {item.quality}</span>}
                  {item.type === "audio" && <span>{item.model_name}</span>}
                  <span>{item.cost} кредит</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 transition hover:bg-gray-50"
                  >
                    <svg
                      className="h-3.5 w-3.5"
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
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 transition hover:bg-gray-50"
                  >
                    <svg
                      className="h-3.5 w-3.5"
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
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
