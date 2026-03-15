"use client";

import { useDeferredValue, useState } from "react";

import type { UserRole } from "@/lib/types";

export type AdminUserSummary = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  phoneNumber: string | null;
  facebookPageUrl: string | null;
  referralCode: string | null;
  credits: number;
  generationCount: number;
  joinedAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRole(role: UserRole) {
  if (role === "admin") {
    return "Админ";
  }

  if (role === "agent") {
    return "Агент";
  }

  return "Хэрэглэгч";
}

function roleClasses(role: UserRole) {
  if (role === "admin") {
    return "bg-slate-900 text-white";
  }

  if (role === "agent") {
    return "bg-cyan-100 text-cyan-800";
  }

  return "bg-slate-100 text-slate-700";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

function toExternalUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function matchesSearch(user: AdminUserSummary, query: string) {
  if (!query) {
    return true;
  }

  const fields = [
    user.fullName,
    user.email,
    user.phoneNumber,
    user.facebookPageUrl,
    user.referralCode,
    formatRole(user.role),
    String(user.credits),
    String(user.generationCount),
    formatDate(user.joinedAt),
  ];

  return fields.some((value) => value?.toLowerCase().includes(query));
}

export function AdminUsersClient({ users }: { users: AdminUserSummary[] }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredUsers = users.filter((user) => matchesSearch(user, normalizedSearch));
  const totalCredits = filteredUsers.reduce((sum, user) => sum + user.credits, 0);
  const totalGenerations = filteredUsers.reduce((sum, user) => sum + user.generationCount, 0);
  const agentCount = filteredUsers.filter((user) => user.role === "agent").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Нийт бүртгэл</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(users.length)}</p>
          <p className="mt-2 text-xs text-slate-400">Бүх role орсон CRM жагсаалт.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Хайлтын үр дүн</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(filteredUsers.length)}</p>
          <p className="mt-2 text-xs text-slate-400">Нэр, имэйл, утас, Facebook page, referral code-оор шүүнэ.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Нийт кредит</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(totalCredits)}</p>
          <p className="mt-2 text-xs text-slate-400">Одоогийн үлдэгдэл кредитийн нийлбэр.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Нийт үүсгэлт</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(totalGenerations)}</p>
          <p className="mt-2 text-xs text-slate-400">Зураг, аудио, видео нийлсэн үүсгэлт.</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Хэрэглэгчдийн CRM</h1>
              <p className="mt-1 text-sm text-slate-500">
                Хамгийн сүүлд бүртгүүлсэн хэрэглэгч хамгийн дээр харагдана. Агентын тоо: {formatCount(agentCount)}.
              </p>
            </div>

            <div className="w-full max-w-xl">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-600">Хайлт</div>
                <div className="flex gap-3">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Нэр, имэйл, утас, Facebook page, referral code..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Цэвэрлэх
                    </button>
                  ) : null}
                </div>
              </label>
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Энэ хайлтад тохирох хэрэглэгч олдсонгүй.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1340px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-6 py-3 font-medium">Хэрэглэгч</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Утас</th>
                  <th className="px-6 py-3 font-medium">Facebook page</th>
                  <th className="px-6 py-3 font-medium">Referral code</th>
                  <th className="px-6 py-3 font-medium">Кредит</th>
                  <th className="px-6 py-3 font-medium">Үүсгэлт</th>
                  <th className="px-6 py-3 font-medium">Бүртгүүлсэн</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const facebookPageUrl = toExternalUrl(user.facebookPageUrl);

                  return (
                    <tr key={user.id} className="border-b border-slate-100 align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {user.fullName?.trim() ? user.fullName : "Нэргүй хэрэглэгч"}
                        </div>
                        <div className="mt-1 text-slate-600">{user.email}</div>
                        <div className="mt-1 text-xs text-slate-400">{user.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleClasses(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {user.phoneNumber ? (
                          <a href={`tel:${user.phoneNumber}`} className="hover:text-cyan-700">
                            {user.phoneNumber}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {user.facebookPageUrl && facebookPageUrl ? (
                          <a
                            href={facebookPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[240px] truncate rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {user.facebookPageUrl}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {user.referralCode ? (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs">
                            {user.referralCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{formatCount(user.credits)}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{formatCount(user.generationCount)}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(user.joinedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
