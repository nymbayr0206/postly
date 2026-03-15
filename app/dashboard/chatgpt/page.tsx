import Link from "next/link";

export default function DashboardChatGptPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-shell brand-grid overflow-hidden rounded-[2rem] px-5 py-6 text-white sm:px-7 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
            AI assistant
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Сургагдсан ChatGPT</h1>
          <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            Энэ page-ийг dashboard дээрээс шууд нээгддэг болголоо. Дараагийн алхмаар энд танай сургагдсан
            assistant-ийн UI-г холбож болно.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(47,188,230,0.28)]"
            >
              Dashboard руу буцах
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
