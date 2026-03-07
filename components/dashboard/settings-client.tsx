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
      id: "profile", label: "Профайл",
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
    {
      id: "notifications", label: "Мэдэгдэл",
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    },
    {
      id: "security", label: "Нууцлал",
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    },
    {
      id: "team", label: "Баг",
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Тохиргоо</h1>
        <p className="text-sm text-gray-600">Өөрийн профайл болон тохиргоогоо удирдах</p>
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm">
          Тохиргоо амжилттай хадгалагдлаа ✓
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition ${
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

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Хувийн мэдээлэл</h2>
            <p className="text-sm text-gray-500 mb-6">Таны профайлын мэдээллийг засах</p>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-700 text-2xl font-bold">{email[0]?.toUpperCase()}</span>
              </div>
              <div>
                <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                  Зураг солих
                </button>
                <p className="text-xs text-gray-400 mt-1">JPG эсвэл PNG. Хамгийн ихдээ 2MB.</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Нэр</label>
                  <input type="text" defaultValue="Бат" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Овог</label>
                  <input type="text" defaultValue="Болд" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Имэйл</label>
                <input type="email" defaultValue={email} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Утас</label>
                <input type="tel" placeholder="+976 99119911" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition">
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Мэдэгдлийн тохиргоо</h2>
            <p className="text-sm text-gray-500">Хүлээн авах мэдэгдлүүдээ удирдах</p>
          </div>

          {[
            { label: "Имэйл мэдэгдэл", desc: "Чухал мэдээллийг имэйлээр хүлээж авах", value: emailNotifs, onChange: setEmailNotifs },
            { label: "Үүсгэлт дууссан мэдэгдэл", desc: "Зураг, видео үүсгэлт дууссан үед мэдэгдэх", value: genNotifs, onChange: setGenNotifs },
            { label: "Долоо хоног бүрийн тайлан", desc: "Долоо хоног бүр ашиглалтын тайлан авах", value: weeklyReport, onChange: setWeeklyReport },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <div className="border-t border-gray-100 pt-6" />}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={item.value} onChange={(e) => item.onChange(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4">
            <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Нууц үг солих</h2>
            <p className="text-sm text-gray-500 mb-6">Дансны нууцлалаа хамгаалах</p>
            <div className="space-y-4">
              {["Одоогийн нууц үг", "Шинэ нууц үг", "Нууц үг баталгаажуулах"].map((label) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">{label}</label>
                  <input type="password" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
                </div>
              ))}
              <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition">
                Нууц үг шинэчлэх
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-red-200 p-6">
            <h2 className="font-semibold text-red-600 mb-1">Аюултай бүс</h2>
            <p className="text-sm text-gray-500 mb-4">Дансаа устгах эсвэл төлбөрөө цуцлах</p>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition">
                Төлбөрийг цуцлах
              </button>
              <button className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition">
                Данс устгах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Багийн гишүүд</h2>
            <p className="text-sm text-gray-500 mb-6">Багийн гишүүдийг удирдах</p>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-700 font-semibold">{email[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{email}</p>
                  <p className="text-xs text-gray-500">Идэвхтэй</p>
                </div>
              </div>
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">Эзэн</span>
            </div>

            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <p className="text-sm text-gray-500 mb-3">Багийн гишүүдийг урих</p>
              <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition">
                Гишүүн урих
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Workspace тохиргоо</h2>
            <p className="text-sm text-gray-500 mb-6">Workspace-ийн нэр болон тохиргоог удирдах</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Workspace нэр</label>
                <input type="text" defaultValue="Миний хэсэг" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition">
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
