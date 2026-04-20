"use client";

import { PushNotificationTestCard } from "@/components/dashboard/push-notification-test-card";

export function SettingsClient({ email }: { email: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Тохиргоо
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
            Мэдэгдэл ба төхөөрөмж
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Энэ хэсгээс төхөөрөмжийн мэдэгдлийн тохиргоог шалгаж, push мэдэгдлийн
            төгсгөлөөс төгсгөл хүртэл туршина.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Хэрэглэгч
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8EE8F1,#2FBCE6)] text-lg font-black text-slate-950">
                {email.charAt(0).toUpperCase() || "P"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{email}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Push мэдэгдлийн туршилт энэ дансанд хадгалагдана.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Анхаарах зүйл
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Android дээр HTTPS орчинд суулгасан PWA-аас шууд туршина.</li>
              <li>
                iPhone, iPad дээр push мэдэгдэл зөвхөн Нүүр дэлгэц дээр суулгасан
                Home Screen web app дотор ажиллана.
              </li>
              <li>
                Энгийн Safari tab дотор Apple push ажиллахгүй тул сайтыг эхлээд
                Нүүр дэлгэц рүү нэмнэ.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <PushNotificationTestCard />
    </div>
  );
}
