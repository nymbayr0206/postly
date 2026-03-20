const benefits = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
    title: "Хязгааргүй зураг",
    description: "Flux Ultra, Flux Dev болон бусад загваруудыг дурын удаа ашигла.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: "Runway видео",
    description: "5–10 секундийн 720p/1080p видео зургаасаа хэдхэн минутад үүсгэ.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    ),
    title: "ElevenLabs аудио",
    description: "20+ дуу хоолойгоор диалог, реклам, подкаст агуулга мгц бэлтгэ.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Шуурхай ажиллагаа",
    description: "QPay-аар тэр дор цэнэглэж, нэн даруй үүсгэлт эхэлнэ.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Хугацаагүй үлдэгдэл",
    description: "Дансандаа байгаа мөнгөө эзэмшиж, дуусах хугацаагүйгээр ашигла.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    title: "Агент болох боломж",
    description: "Бонус багцаар агент болж, орлогоо нэмэгдүүл.",
  },
];

export function BillingValueBanner() {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm sm:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-300">
          ✦ ЯАГААД АВАХ ВЭ?
        </div>
        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
          Нэг багц — гурван AI хэрэгсэл
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
          Зураг, видео, аудио гурвыг нэг дансаараа ашиглана. Монголын зах зээлд хамгийн өндөр үр ашгийн AI платформ.
        </p>
      </div>

      {/* Benefits grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <div
            key={benefit.title}
            className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.05] p-4"
          >
            <div className="mt-0.5 shrink-0 rounded-xl bg-cyan-400/15 p-2 text-cyan-300">
              {benefit.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{benefit.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-400">{benefit.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Social proof strip */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-yellow-400">★★★★★</span>
          <span>Монгол хэрэглэгчдэд зориулсан</span>
        </div>
        <div className="hidden h-4 w-px bg-white/20 sm:block" />
        <div className="text-sm text-slate-300">
          <span className="font-bold text-white">QPay</span> дэмжигдсэн
        </div>
        <div className="hidden h-4 w-px bg-white/20 sm:block" />
        <div className="text-sm text-slate-300">
          <span className="font-bold text-white">Шуурхай</span> цэнэглэлт
        </div>
        <div className="hidden h-4 w-px bg-white/20 sm:block" />
        <div className="text-sm text-slate-300">
          <span className="font-bold text-white">Хугацаагүй</span> үлдэгдэл
        </div>
      </div>
    </section>
  );
}
