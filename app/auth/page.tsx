import { redirect } from "next/navigation";

import { PostlyLogo } from "@/components/brand/postly-logo";
import { AuthForm } from "@/components/auth/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="brand-shell brand-grid relative overflow-hidden rounded-[2rem] px-5 py-6 text-white sm:px-7 sm:py-8 lg:min-h-[720px] lg:px-10 lg:py-10">
          <div className="absolute -right-16 top-8 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -left-10 bottom-12 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col">
            <PostlyLogo showTagline tone="light" />

            <div className="mt-10 max-w-xl">
              <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Mobile-first AI Workspace
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Кредитээр ажилладаг контент студио
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Зураг, видео, аудио үүсгэх урсгалууд нэг dashboard дотор. Mobile дээр хурдан,
                desktop дээр илүү удирдлагатай ажиллах UX-ээр бүтээв.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Зураг үүсгэх", "Пост, product visual, campaign image"],
                ["Видео үүсгэх", "Motion preview, reel, social clip"],
                ["Аудио үүсгэх", "Voiceover, dialogue, ad audio"],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-sm text-slate-300">{description}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-3">
              {[
                ["3 алхам", "Багц сонгох, төлөх, контент үүсгэх"],
                ["30 мин", "Админ баталгаажуулалтын зорилтот хугацаа"],
                ["Mobile UX", "Доод navigation, нэг гараар ашиглахад тохирсон"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="mt-1 text-sm text-slate-300">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="brand-surface rounded-[2rem] px-4 py-4 sm:px-5 sm:py-5 lg:p-6">
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
