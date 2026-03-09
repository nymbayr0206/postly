import Image from "next/image";
import Link from "next/link";

import { PostlyLogo } from "@/components/brand/postly-logo";

type ShowcaseKind = "image" | "video" | "audio";

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
    kind: "video",
    eyebrow: "Видео үүсгэх",
    title: "Нэг зурагнаас хөдөлгөөнтэй богино reel бүтээнэ",
    description:
      "Зураг, scene motion, camera direction-оо нэг дор өгөөд social-ready богино видео гаргана.",
    prompt:
      "Luxury cinematic perfume commercial animation. A turquoise glass perfume bottle labeled \"AURA\" standing on a glossy reflective surface in a dark elegant studio. Slow cinematic camera push-in. Soft golden light reflections move across the glass bottle and cap. Subtle mist and glowing perfume aura particles gently flow around the bottle. Elegant light rays appear from behind creating a luxury atmosphere. The reflection on the floor slowly shimmers. Ultra realistic, high-end perfume advertisement style, dramatic lighting, shallow depth of field, 4K cinematic look, smooth slow motion.",
    outputLabel: "Жишээ гарц",
    outputSummary: "Luxury perfume commercial motion preview",
    detail: "Slow push-in · glowing mist particles · reflective studio floor",
  },
  {
    kind: "image",
    eyebrow: "Зураг үүсгэх",
    title: "Campaign visual, poster, product shot-оо prompt-оос гаргана",
    description:
      "Бүтээгдэхүүний сурталчилгаа, social post, key visual зэргийг English prompt-оор тогтвортой бүтээнэ.",
    prompt:
      "A luxury perfume bottle centered on reflective black glass, turquoise glowing liquid, elegant gold cap, dramatic dark background, premium studio lighting, photorealistic advertising shot, high-end fragrance campaign",
    outputLabel: "Жишээ гарц",
    outputSummary: "Luxury perfume campaign image",
    detail: "Centered bottle · reflective black base · premium gold highlight",
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
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">English prompt</span>
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

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(132,224,239,0.26),transparent_22%),linear-gradient(180deg,#f6fbfe_0%,#ebf5fa_52%,#e3edf5_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
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
          <section className="brand-shell brand-grid overflow-hidden rounded-[2.2rem] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="relative z-10">
                <div className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  Mobile-first AI workspace
                </div>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Prompt-оосоо зураг, видео, аудио бүтээдэг контент студио
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Postly.mn нь social post, campaign visual, short video, voiceover зэрэг контентоо нэг dashboard дотроос
                  бүтээх урсгал. Prompt-оо English дээр бичээд, үр дүнгээ Монгол хэрэглээндээ шууд ашиглахад зориулагдсан.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/auth"
                    className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(47,188,230,0.28)]"
                  >
                    Одоо турших
                  </Link>
                  <Link
                    href="/auth"
                    className="rounded-full border border-white/12 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Данс үүсгэх
                  </Link>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Зураг үүсгэх</div>
                    <div className="mt-2 text-sm leading-6 text-slate-200">Product visual, poster, ad image</div>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Видео үүсгэх</div>
                    <div className="mt-2 text-sm leading-6 text-slate-200">Prompt + source image-оос teaser clip</div>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Аудио үүсгэх</div>
                    <div className="mt-2 text-sm leading-6 text-slate-200">Voiceover, dialogue, branded narration</div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 space-y-4">
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-cyan-200/14 bg-white/6 p-4 text-white">
                    <div className="text-xs uppercase tracking-[0.22em] text-cyan-100">Prompt зөвлөмж</div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Subject, lighting, camera angle, mood-оо English дээр тодорхой бичих тусам үр дүн тогтвортой гарна.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-cyan-200/14 bg-white/6 p-4 text-white">
                    <div className="text-xs uppercase tracking-[0.22em] text-cyan-100">Mobile flow</div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Доороос дээш action layout, том preview area, хурдан generate flow-оор гар утсанд илүү тохирсон.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="brand-surface rounded-[1.6rem] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Жишээ prompt</div>
              <div className="mt-3 text-3xl font-black text-slate-950">3 төрлийн demo</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Зураг, видео, аудио урсгал тус бүр дээр ямар prompt-оор ямар output гарч болохыг шууд харуулна.
              </p>
            </div>
            <div className="brand-surface rounded-[1.6rem] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Prompt хэл</div>
              <div className="mt-3 text-3xl font-black text-slate-950">English input</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                User-facing тайлбар нь Монгол, харин prompt жишээнүүдийг English-ээр өгч тогтвортой preview үзүүлнэ.
              </p>
            </div>
            <div className="brand-surface rounded-[1.6rem] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">CTA</div>
              <div className="mt-3 text-3xl font-black text-slate-950">Шууд эхлэх</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Landing page-ээсээ шууд бүртгэл рүү орж, wallet credit-ээрээ generation flow-оо эхлүүлнэ.
              </p>
            </div>
          </section>

          <div className="space-y-6">
            {showcaseItems.map((item, index) => (
              <ShowcaseSection key={item.kind} item={item} reverse={index % 2 === 1} />
            ))}
          </div>

          <section className="brand-surface rounded-[2rem] px-5 py-6 sm:px-7 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">Дараагийн алхам</div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Өөрийн prompt-оор шууд туршиж үзэхэд бэлэн
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                  Бүртгүүлээд dashboard дотроос зураг, видео, аудио generation flow-оо эхлүүл. Prompt-оо English дээр
                  бичиж, гарах үр дүнгээ Монгол контентын хэрэглээндээ шууд ашиглана.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/auth" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                  Нэвтрэх
                </Link>
                <Link
                  href="/auth"
                  className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-5 py-3 text-sm font-black text-slate-950"
                >
                  Бүртгүүлэх
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
