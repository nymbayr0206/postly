import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HistoryItem =
  | { type: "image"; id: string; model_name: string; prompt: string; aspect_ratio: string | null; cost: number; url: string; created_at: string }
  | { type: "audio"; id: string; model_name: string; prompt: string; cost: number; url: string; created_at: string }
  | { type: "video"; id: string; model_name: string; prompt: string; duration: number; quality: string; cost: number; url: string; image_url: string; created_at: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин өмнө`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  return `${Math.floor(hours / 24)} өдрийн өмнө`;
}

function TypeBadge({ type }: { type: "image" | "audio" | "video" }) {
  const labels = { image: "Зураг", audio: "Аудио", video: "Видео" };
  const colors = {
    image: "bg-blue-100 text-blue-700",
    audio: "bg-purple-100 text-purple-700",
    video: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

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
    ...(imagesRes.data ?? []).map((r) => ({
      type: "image" as const,
      id: r.id,
      model_name: r.model_name,
      prompt: r.prompt,
      aspect_ratio: r.aspect_ratio ?? null,
      cost: r.cost,
      url: r.image_url,
      created_at: r.created_at,
    })),
    ...(audiosRes.data ?? []).map((r) => ({
      type: "audio" as const,
      id: r.id,
      model_name: r.model_name,
      prompt: r.prompt,
      cost: r.cost,
      url: r.audio_url,
      created_at: r.created_at,
    })),
    ...(videosRes.data ?? []).map((r) => ({
      type: "video" as const,
      id: r.id,
      model_name: r.model_name,
      prompt: r.prompt,
      duration: r.duration,
      quality: r.quality,
      cost: r.cost,
      url: r.video_url,
      image_url: r.image_url,
      created_at: r.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Түүх</h1>
        <p className="text-sm text-gray-600">Таны бүх үүсгэлтүүдийн түүх</p>
      </div>

      <div className="mb-6 text-sm text-gray-500">
        {items.length} үүсгэлт олдлоо
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
          </div>
          <p className="font-medium text-gray-900 mb-2">Үүсгэлт байхгүй байна</p>
          <p className="text-sm text-gray-500">Зураг, видео эсвэл аудио үүсгэж эхэлнэ үү.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {items.map((item) => (
            <div key={`${item.type}-${item.id}`} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Thumbnail / Preview */}
              <div className="aspect-video bg-gray-100 relative">
                {item.type === "image" && (
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                )}
                {item.type === "video" && (
                  <video
                    src={item.url}
                    poster={item.image_url}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                {item.type === "audio" && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-7 h-7 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <audio controls src={item.url} className="w-full" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <TypeBadge type={item.type} />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{item.prompt}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{timeAgo(item.created_at)}</span>
                  {item.type === "image" && <span>{item.aspect_ratio ?? "—"}</span>}
                  {item.type === "video" && <span>{item.duration}с · {item.quality}</span>}
                  {item.type === "audio" && <span>{item.model_name}</span>}
                  <span>{item.cost} кредит</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Харах
                  </a>
                  <a
                    href={item.url}
                    download
                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
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
