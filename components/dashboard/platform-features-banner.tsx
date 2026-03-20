import Link from "next/link";

const features = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
    label: "Зураг",
    title: "Хэдхэн секундэд профессиональ зураг",
    description: "Flux болон бусад хамгийн сүүлийн үеийн AI загваруудыг ашиглан дурын санааг нарийн зураг болгон хувиргана. Уран бүтээлчид, маркетерууд, агентуудад зориулсан.",
    href: "/dashboard/image",
    gradient: "from-cyan-500/20 to-blue-500/10",
    border: "border-cyan-200/60",
    iconBg: "bg-cyan-100 text-cyan-700",
    badge: "Flux · Ultra HD",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    label: "Видео",
    title: "Зургаас видео хэдхэн минутад",
    description: "Runway Gen-4 Turbo технологиор зургаасаа кино чанартай богино видео үүсгэнэ. Сошиал медиа, реклам, бүтээлч агуулгад тохиромжтой.",
    href: "/dashboard/video",
    gradient: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-200/60",
    iconBg: "bg-violet-100 text-violet-700",
    badge: "Runway Gen-4 Turbo",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    ),
    label: "Аудио",
    title: "Олон хоолойтой яриа нэг дор",
    description: "ElevenLabs-ийн дэвшилтэт технологиор олон дуу хоолойтой диалог, реклам текст, подкаст агуулга хэдхэн секундэд бэлтгэнэ.",
    href: "/dashboard/audio",
    gradient: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-200/60",
    iconBg: "bg-emerald-100 text-emerald-700",
    badge: "ElevenLabs",
  },
];

const stats = [
  { value: "3", label: "AI платформ нэгдсэн" },
  { value: "HD+", label: "Зураг чанар" },
  { value: "1080p", label: "Видео чанар" },
  { value: "20+", label: "Дуу хоолой" },
];

export function PlatformFeaturesBanner() {
  return (
    <section className="brand-surface overflow-hidden rounded-[2rem]">
      {/* Header */}
      <div className="brand-shell brand-grid rounded-[2rem] px-5 py-8 sm:px-7 lg:px-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/12 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">
              ✦ AI БҮТЭЭЛЧ ХЭРЭГСЛҮҮД
            </div>
            <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
              Нэг платформ дээр<br className="hidden sm:block" /> бүх зүйлийг бүтээнэ
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Зураг, видео, аудио — гурван AI хэрэгслийг нэг дороос ашиглаад маркетинг агуулгаа хэдхэн минутад бэлтгэ.
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="shrink-0 rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_16px_36px_rgba(47,188,230,0.28)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Багц авах →
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
              <div className="text-xl font-black text-white">{stat.value}</div>
              <div className="mt-0.5 text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {features.map((feature) => (
          <Link
            key={feature.label}
            href={feature.href}
            className={`group relative flex flex-col gap-3 bg-gradient-to-br p-6 transition-colors hover:bg-slate-50 ${feature.gradient}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`rounded-2xl p-2.5 ${feature.iconBg}`}>
                {feature.icon}
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${feature.border} bg-white/80 text-slate-600`}>
                {feature.badge}
              </span>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{feature.label}</div>
              <h3 className="mt-1 text-base font-black leading-snug text-slate-900 group-hover:text-cyan-700 transition-colors">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
            </div>
            <div className="mt-auto pt-2">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 group-hover:gap-2 transition-all">
                Туршиж үзэх <span>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
