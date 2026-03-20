import Image from "next/image";
import Link from "next/link";

import { PostlyLogo } from "@/components/brand/postly-logo";
import { formatMnt } from "@/lib/generation-pricing";

type ShowcaseKind = "image" | "video" | "audio";

type HeroPricingItem = {
  kind: ShowcaseKind;
  title: string;
  unitLabel: string;
  credits: number;
  priceMnt: number;
  description: string;
};

type ShowcaseItem = {
  kind: ShowcaseKind;
  eyebrow: string;
  title: string;
  description: string;
  prompt: string;
  outputLabel: string;
  outputSummary: string;
  detail: string;
};

const showcaseItems: ShowcaseItem[] = [
  {
    kind: "image",
    eyebrow: "Зураг үүсгэх",
    title: "Санаагаа poster, campaign visual, product shot болгоно",
    description:
      "Бүтээгдэхүүний сурталчилгаа, social post, key visual зэргийг English тайлбараар тогтвортой бүтээнэ.",
    prompt:
      "A luxury perfume bottle centered on reflective black glass, turquoise glowing liquid, elegant gold cap, dramatic dark background, premium studio lighting, photorealistic advertising shot, high-end fragrance campaign",
    outputLabel: "Жишээ гарц",
    outputSummary: "Luxury perfume campaign image",
    detail: "Centered bottle · reflective black base · premium gold highlight",
  },
  {
    kind: "video",
    eyebrow: "Видео үүсгэх",
    title: "Нэг зургаа хөдөлгөөнтэй teaser video болгоно",
    description:
      "Эх зураг, хөдөлгөөн, camera direction-оо нэг дор тайлбарлаад social-ready богино видео гаргана.",
    prompt:
      "Luxury cinematic perfume commercial animation. A turquoise glass perfume bottle labeled \"AURA\" standing on a glossy reflective surface in a dark elegant studio. Slow cinematic camera push-in. Soft golden light reflections move across the glass bottle and cap. Subtle mist and glowing perfume aura particles gently flow around the bottle. Elegant light rays appear from behind creating a luxury atmosphere. The reflection on the floor slowly shimmers. Ultra realistic, high-end perfume advertisement style, dramatic lighting, shallow depth of field, 4K cinematic look, smooth slow motion.",
    outputLabel: "Жишээ гарц",
    outputSummary: "Luxury perfume commercial motion preview",
    detail: "Slow push-in · glowing mist particles · reflective studio floor",
  },
  {
    kind: "audio",
    eyebrow: "Аудио үүсгэх",
    title: "Voiceover, dialogue, ad read-аа бэлэн аудио болгоно",
    description:
      "Брендийн өнгө аястай voiceover, campaign audio, character dialogue-ийг хурдан боловсруулна.",
    prompt:
      "Create a calm premium brand voiceover for a spring campaign launch, warm pacing, natural pauses, confident female narration, clean studio tone",
    outputLabel: "Жишээ гарц",
    outputSummary: "30 секундын premium voiceover",
    detail: "Warm tone · clean narration · ad-ready pacing",
  },
];

const workflowSteps = [
  {
    step: "01",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
    title: "Сургагдсан ChatGPT-д хэлнэ",
    description: "Монгол хэлээрээ санаагаа хэл — ChatGPT тань Postly-д зориулсан perfect English prompt-ыг бэлтгэж өгнө.",
    badge: "GPT-4o powered",
    color: "text-emerald-300",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/8",
  },
  {
    step: "02",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
      </svg>
    ),
    title: "Prompt-оо Postly-д хуулна",
    description: "ChatGPT-ийн бэлтгэсэн prompt-ыг Зураг, Видео эсвэл Аудио генератор дотор тавьж, загвараа сонгоно.",
    badge: "Нэг дор 3 хэрэгсэл",
    color: "text-cyan-300",
    border: "border-cyan-400/20",
    bg: "bg-cyan-400/8",
  },
  {
    step: "03",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: "HD контент татаж авна",
    description: "Хэдхэн секундэд зураг, хэдхэн минутад видео, дуу хоолой бэлэн болно. Татаж аваад шууд нийтэл.",
    badge: "Секундэд бэлэн",
    color: "text-violet-300",
    border: "border-violet-400/20",
    bg: "bg-violet-400/8",
  },
];

const mobileServiceCards = [
  {
    kind: "image" as ShowcaseKind,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
    iconBg: "bg-cyan-400/15 text-cyan-300",
    labelColor: "text-cyan-400",
    title: "HD зураг хэдхэн секундэд",
    description: "Poster, product shot, campaign visual — prompt бичвэл тэр дор гарна.",
  },
  {
    kind: "video" as ShowcaseKind,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    iconBg: "bg-violet-400/15 text-violet-300",
    labelColor: "text-violet-400",
    title: "Зургаас кино чанартай видео",
    description: "Runway Gen-4 Turbo-оор teaser, reels, ad video хэдхэн минутад.",
  },
  {
    kind: "audio" as ShowcaseKind,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    ),
    iconBg: "bg-emerald-400/15 text-emerald-300",
    labelColor: "text-emerald-400",
    title: "Олон дуу хоолойтой аудио",
    description: "ElevenLabs-ийн 20+ дуу хоолойгоор voiceover, dialogue, ad нэг дор.",
  },
];

const whyItems = [
  {
    icon: "🇲🇳",
    title: "Монгол зах зээлд зориулав",
    description: "QPay-аар тэр дор цэнэглэж, Монгол хэрэглэгчдэд ойлгомжтой үнэ, интерфейс.",
  },
  {
    icon: "⚡",
    title: "Нэг данснаас гурван AI",
    description: "Зураг, видео, аудио — тус бүр өөр платформ бус, нэг дансны үлдэгдлээс ажиллана.",
  },
  {
    icon: "🎯",
    title: "Prompt туслагчтай",
    description: "Сургагдсан ChatGPT-г ашиглан аль ч AI-д тохирсон prompt-оо хялбар бэлтгэ.",
  },
  {
    icon: "💎",
    title: "Хугацаагүй үлдэгдэл",
    description: "Цэнэглэсэн мөнгөө хэзээ ч хэрэглэж болно — дуусах хугацаа байхгүй.",
  },
  {
    icon: "🚀",
    title: "Ажил мэргэжлийн чанар",
    description: "Flux Ultra, Runway Gen-4, ElevenLabs — дэлхийн тэргүүний загваруудыг нэг дороос.",
  },
  {
    icon: "📱",
    title: "Гар утсанд оптимайз",
    description: "Mobile-first дизайнтай — гар утснаасаа контент бэлтгэж, нийтэл.",
  },
];

function ShowcasePreview({ kind }: { kind: ShowcaseKind }) {
  if (kind === "image") {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-cyan-200/50 bg-[radial-gradient(circle_at_top,rgba(135,242,255,0.34),transparent_30%),linear-gradient(160deg,#071525,#0d2741_52%,#143553)]">
        <Image
          src="/unertei-us.jpg"
          alt="Luxury perfume bottle showcase"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,21,37,0.08),rgba(7,21,37,0.2))]" />
        <div className="absolute right-5 top-5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100">
          Preview
        </div>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-cyan-200/50 bg-[linear-gradient(160deg,#071525,#0b2440_45%,#123558)]">
        <video
          src="/unerteius-bichleg.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,21,37,0.12),rgba(7,21,37,0.28))]" />
        <div className="absolute left-5 top-5 rounded-full border border-white/14 bg-black/24 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100/80">
          Video preview
        </div>
        <div className="absolute bottom-5 left-5 right-5 rounded-[1.1rem] border border-white/10 bg-black/28 px-4 py-3">
          <div className="h-2 rounded-full bg-white/10">
            <div className="h-2 w-2/3 rounded-full bg-[linear-gradient(90deg,#84E0EF,#2FBCE6)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-cyan-200/50 bg-[linear-gradient(160deg,#071525,#0a2038_48%,#143559)] p-5">
      <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100">Audio render</div>
          <div className="rounded-full bg-white/8 px-3 py-1 text-[11px] text-cyan-100">MP3</div>
        </div>
        <div className="mt-6 flex h-28 items-end justify-between gap-2">
          {[36, 52, 24, 68, 45, 74, 29, 58, 34, 79, 42, 61].map((height, index) => (
            <div
              key={`${height}-${index}`}
              className="w-full rounded-full bg-[linear-gradient(180deg,#9EF0FA,#2FBCE6_65%,#1376A8)]"
              style={{ height }}
            />
          ))}
        </div>
        <div className="mt-6 grid gap-2">
          <div className="h-3 rounded-full bg-white/10" />
          <div className="h-3 w-4/5 rounded-full bg-white/7" />
          <div className="h-3 w-3/5 rounded-full bg-white/7" />
        </div>
      </div>
    </div>
  );
}

function PromptCard({ prompt, eyebrow }: { prompt: string; eyebrow: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-4 shadow-[0_20px_45px_rgba(3,10,19,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
          {eyebrow}
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">English example</span>
      </div>
      <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-black/25 p-4 font-mono text-[13px] leading-6 text-slate-200">
        {prompt}
      </div>
    </div>
  );
}

function ShowcaseSection({ item, reverse = false }: { item: ShowcaseItem; reverse?: boolean }) {
  return (
    <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] p-4 sm:p-6 lg:p-8">
      <div className={`grid gap-5 lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
            {item.eyebrow}
          </div>
          <div>
            <h2 className="max-w-xl text-2xl font-black tracking-tight text-white sm:text-3xl">
              {item.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              {item.description}
            </p>
          </div>
          <PromptCard prompt={item.prompt} eyebrow={item.eyebrow} />
        </div>

        <div className="space-y-4">
          <ShowcasePreview kind={item.kind} />
          <div className="rounded-[1.5rem] border border-cyan-200/14 bg-white/6 p-4 text-white">
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-100">{item.outputLabel}</div>
            <div className="mt-2 text-xl font-bold">{item.outputSummary}</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingPage({ pricing }: { pricing: HeroPricingItem[] }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(47,188,230,0.18),transparent_24%),linear-gradient(180deg,#040b14_0%,#07111d_50%,#0b1724_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* ── Navbar ── */}
        <header className="brand-surface flex items-center justify-between rounded-[1.6rem] px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center">
            <PostlyLogo compact showTagline className="w-[142px] sm:w-[168px]" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Нэвтрэх
            </Link>
            <Link
              href="/auth"
              className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-4 py-2 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(47,188,230,0.24)]"
            >
              Бүртгүүлэх
            </Link>
          </div>
        </header>

        <main className="space-y-6 py-6 sm:space-y-8 sm:py-8 lg:space-y-10 lg:py-10">

          {/* ── Hero ── */}
          <section className="brand-shell brand-grid overflow-hidden rounded-[2.2rem] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Монгол маркетерын AI платформ
                </div>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Санаагаа poster,<br />video, audio<br />болгоорой
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Postly.mn нь social post, campaign visual, short video, voiceover зэрэг
                  контентоо нэг dashboard дотроос бүтээх урсгал. Хүссэн санаагаа English-ээр
                  тайлбарлаад, гарсан үр дүнгээ Монгол хэрэглээндээ шууд ашиглахад зориулагдсан.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/auth"
                    className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(47,188,230,0.28)] transition-transform hover:-translate-y-0.5"
                  >
                    Одоо турших →
                  </Link>
                  <Link
                    href="/auth"
                    className="rounded-full border border-white/12 bg-white/[0.08] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
                  >
                    Данс үүсгэх
                  </Link>
                </div>

                {/* Mobile: service cards — no prices, just what's possible */}
                <div className="mt-7 grid grid-cols-1 gap-3 sm:hidden">
                  {mobileServiceCards.map((svc) => (
                    <Link
                      key={svc.kind}
                      href="/auth"
                      className="flex items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4 active:bg-white/10"
                    >
                      <div className={`shrink-0 rounded-2xl p-3 ${svc.iconBg}`}>
                        {svc.icon}
                      </div>
                      <div>
                        <div className={`text-xs font-bold uppercase tracking-widest ${svc.labelColor}`}>{svc.kind === "image" ? "Зураг" : svc.kind === "video" ? "Видео" : "Аудио"}</div>
                        <div className="mt-0.5 text-sm font-black text-white">{svc.title}</div>
                        <div className="mt-1 text-xs leading-relaxed text-slate-400">{svc.description}</div>
                      </div>
                      <svg className="ml-auto shrink-0 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  ))}
                </div>

                {/* Desktop: pricing mini-cards with MNT prices */}
                <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-3">
                  {pricing.map((item) => (
                    <div
                      key={item.kind}
                      className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4"
                    >
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.title}</div>
                      <div className="mt-3 text-2xl font-black tracking-tight text-white">
                        {formatMnt(item.priceMnt)}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                        {item.unitLabel}
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-200">{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 hidden space-y-4 sm:block">
                <div className="rounded-[1.75rem] border border-cyan-200/14 bg-white/8 p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {["Зураг", "Видео", "Аудио"].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          index === 0
                            ? "bg-cyan-100 text-cyan-900"
                            : "border border-white/12 bg-white/6 text-slate-300"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <ShowcasePreview kind="image" />
                </div>

                {/* Replaced info cards with compelling marketing callouts */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-cyan-200/14 bg-white/6 p-4 text-white">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
                      ✦ ChatGPT туслагч
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Монголоор санаагаа хэлэхэд ChatGPT тань Postly-д зориулсан perfect prompt бэлтгэнэ.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-cyan-200/14 bg-white/6 p-4 text-white">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">
                      ✦ QPay · Шуурхай
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      QPay-аар нэг дор цэнэглэж, хугацаагүй үлдэгдлийг хүссэн үедээ ашигла.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── ChatGPT Workflow section ── */}
          <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                ✦ Хэрхэн ажилладаг вэ?
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                3 алхамаар контент бэлтгэнэ
              </h2>
              <p className="mt-3 mx-auto max-w-xl text-sm leading-7 text-slate-300">
                Сургагдсан ChatGPT болон Postly.mn-г хослуулан ашиглавал аль ч контент хэдхэн минутад бэлэн болно.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <div key={step.step} className={`relative rounded-[1.75rem] border p-6 ${step.border} ${step.bg}`}>
                  {/* Connector arrow between steps */}
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-slate-800 p-1.5 text-slate-400 sm:block">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-2xl border p-3 ${step.border} bg-black/20 ${step.color}`}>
                      {step.icon}
                    </div>
                    <span className={`text-4xl font-black opacity-20 ${step.color}`}>{step.step}</span>
                  </div>
                  <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${step.border} bg-black/20 ${step.color}`}>
                    {step.badge}
                  </div>
                  <h3 className="mt-3 text-base font-black text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>

            {/* ChatGPT CTA */}
            <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-5 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-black/20 text-2xl">
                  🤖
                </div>
                <div>
                  <div className="text-sm font-black text-white">Сургагдсан ChatGPT нээлттэй байна</div>
                  <div className="mt-0.5 text-xs text-slate-400">Postly.mn-д зориулсан prompt бичүүлэхэд оптимайзчилагдсан</div>
                </div>
              </div>
              <Link
                href="https://chatgpt.com/g/g-69b6e113f94481918f10085023c5f44d-postly-content-zovlokh"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/12 px-5 py-2.5 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/20"
              >
                ChatGPT нээх →
              </Link>
            </div>
          </section>

          {/* ── Why Postly — 6 benefits grid ── */}
          <section className="brand-surface overflow-hidden rounded-[2rem] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
            <div className="mb-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                ✦ Яагаад Postly.mn?
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Монгол маркетерт зориулсан<br className="hidden sm:block" /> ганц платформ
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {whyItems.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="text-3xl">{item.icon}</div>
                  <h3 className="mt-3 text-base font-black text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Showcase sections ── */}
          <div className="space-y-6">
            {showcaseItems.map((item, index) => (
              <ShowcaseSection key={item.kind} item={item} reverse={index % 2 === 1} />
            ))}
          </div>

          {/* ── Final CTA banner ── */}
          <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] px-5 py-10 text-center sm:px-7 lg:px-10 lg:py-14">
            <div className="mx-auto max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                ✦ Эхлэхэд бэлэн үү?
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Өнөөдрөөс AI-аар<br />контент бүтээж эхэл
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                Бүртгүүлж, QPay-аар цэнэглэж, хэдхэн минутад анхны зураг, видео, аудиогоо гарга.
                Хугацаагүй үлдэгдэл, тэр дор ажиллана.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/auth"
                  className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-8 py-4 text-base font-black text-slate-950 shadow-[0_20px_48px_rgba(47,188,230,0.32)] transition-transform hover:-translate-y-0.5"
                >
                  Үнэгүй бүртгүүлэх →
                </Link>
                <Link
                  href="/auth"
                  className="rounded-full border border-white/14 bg-white/[0.08] px-8 py-4 text-base font-semibold text-white transition hover:bg-white/[0.14]"
                >
                  Нэвтрэх
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {["QPay дэмжигдсэн", "Хугацаагүй үлдэгдэл", "Шуурхай цэнэглэлт", "3 AI нэгдсэн"].map((badge) => (
                  <div
                    key={badge}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-300"
                  >
                    ✓ {badge}
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
