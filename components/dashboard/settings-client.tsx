"use client";

import { useState } from "react";

type Tab = "profile" | "notifications" | "security" | "team";

export function SettingsClient({ email }: { email: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [genNotifs, setGenNotifs] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "profile",
      label: "Профайл",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: "notifications",
      label: "Мэдэгдэл",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      ),
    },
    {
      id: "security",
      label: "Нууцлал",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      id: "team",
      label: "Баг",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">Тохиргоо</h1>
        <p className="text-sm text-gray-600">Профайл болон хувийн тохиргоогоо эндээс удирдана.</p>
      </div>

      {saved && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Тохиргоо амжилттай хадгалагдлаа.
        </div>
      )}

      <div className="mb-6 flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-1 font-semibold text-gray-900">Хувийн мэдээлэл</h2>
            <p className="mb-6 text-sm text-gray-500">Профайлынхаа үндсэн мэдээллийг шинэчилнэ.</p>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <span className="text-2xl font-bold text-purple-700">{email[0]?.toUpperCase()}</span>
              </div>
              <div>
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50">
                  Зураг солих
                </button>
                <p className="mt-1 text-xs text-gray-400">JPG эсвэл PNG. Хамгийн ихдээ 2MB.</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Нэр</label>
                  <input type="text" defaultValue="Бат" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Овог</label>
                  <input type="text" defaultValue="Болд" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Имэйл</label>
                <input type="email" defaultValue={email} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Утас</label>
                <input type="tel" placeholder="+976 99119911" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
              </div>
              <button onClick={handleSave} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700">
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div>
            <h2 className="mb-1 font-semibold text-gray-900">Мэдэгдлийн тохиргоо</h2>
            <p className="text-sm text-gray-500">Хүлээж авах мэдэгдлүүдээ сонгоно.</p>
          </div>

          {[
            { label: "Имэйл мэдэгдэл", desc: "Чухал мэдээллийг имэйлээр хүлээн авах", value: emailNotifs, onChange: setEmailNotifs },
            { label: "Үүсгэлт дууссан мэдэгдэл", desc: "Зураг, видео, аудио бэлэн болмогц мэдэгдэнэ", value: genNotifs, onChange: setGenNotifs },
            { label: "Долоо хоногийн тайлан", desc: "Ашиглалтын нэгтгэлийг долоо хоног бүр авах", value: weeklyReport, onChange: setWeeklyReport },
          ].map((item, index) => (
            <div key={item.label}>
              {index > 0 && <div className="border-t border-gray-100 pt-6" />}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={item.value} onChange={(event) => item.onChange(event.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4">
            <button onClick={handleSave} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-1 font-semibold text-gray-900">Нууц үг солих</h2>
            <p className="mb-6 text-sm text-gray-500">Дансныхаа аюулгүй байдлыг шинэчилнэ.</p>
            <div className="space-y-4">
              {["Одоогийн нууц үг", "Шинэ нууц үг", "Шинэ нууц үг давтах"].map((label) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">{label}</label>
                  <input type="password" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                </div>
              ))}
              <button onClick={handleSave} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700">
                Нууц үг шинэчлэх
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <h2 className="mb-1 font-semibold text-red-600">Эрсдэлтэй хэсэг</h2>
            <p className="mb-4 text-sm text-gray-500">Төлөвлөгөө цуцлах эсвэл данс устгах үйлдлүүд энд байна.</p>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50">
                Төлөвлөгөө цуцлах
              </button>
              <button className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50">
                Данс устгах
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-1 font-semibold text-gray-900">Багийн гишүүд</h2>
            <p className="mb-6 text-sm text-gray-500">Багийн хүмүүсийг удирдана.</p>

            <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <span className="font-semibold text-purple-700">{email[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{email}</p>
                  <p className="text-xs text-gray-500">Идэвхтэй</p>
                </div>
              </div>
              <span className="rounded-full bg-purple-50 px-2 py-1 text-xs text-purple-700">Эзэмшигч</span>
            </div>

            <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
              <svg className="mx-auto mb-3 h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="mb-3 text-sm text-gray-500">Шинэ гишүүн урих</p>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50">
                Гишүүн урих
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-1 font-semibold text-gray-900">Ажлын орчны тохиргоо</h2>
            <p className="mb-6 text-sm text-gray-500">Ажлын орчны нэр болон үндсэн тохиргоог өөрчилнө.</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Ажлын орчны нэр</label>
                <input type="text" defaultValue="Миний ажлын орчин" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
              </div>
              <button onClick={handleSave} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700">
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
