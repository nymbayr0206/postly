"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { signOutAction } from "@/app/dashboard/actions";
import type { UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function roleLabel(role: UserRole) {
  if (role === "admin") {
    return "Админ";
  }

  if (role === "agent") {
    return "Агент";
  }

  return "Хэрэглэгч";
}

function MenuButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 lg:hidden"
    >
      {children}
    </button>
  );
}

function Sidebar({
  pathname,
  role,
  navItems,
  onNavigate,
}: {
  pathname: string;
  role: UserRole;
  navItems: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            P
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">Postly</div>
            <div className="text-xs text-slate-500">Контентын ажлын орчин</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive(pathname, item)
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}

        {role === "admin" ? (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={`mt-3 block rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              pathname.startsWith("/admin")
                ? "border-cyan-700 bg-cyan-700 text-white"
                : "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
            }`}
          >
            Админ самбар
          </Link>
        ) : null}
      </nav>
    </div>
  );
}

export default function DashboardLayoutShell({
  children,
  credits,
  email,
  role,
  showAgentOnboarding,
  showLessons,
}: {
  children: React.ReactNode;
  credits: number;
  email: string;
  role: UserRole;
  showAgentOnboarding: boolean;
  showLessons: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navItems = useMemo(() => {
    const items: NavItem[] = [
      { href: "/dashboard", label: "Ерөнхий", exact: true },
      { href: "/dashboard/image", label: "Зураг үүсгэх" },
      { href: "/dashboard/video", label: "Зургаас видео" },
      { href: "/dashboard/audio", label: "Аудио үүсгэх" },
    ];

    if (showLessons) {
      items.push({ href: "/dashboard/lessons", label: "Хичээл" });
    }

    items.push(
      { href: "/dashboard/history", label: "Түүх" },
      { href: "/dashboard/billing", label: "Кредит" },
    );

    if (showAgentOnboarding) {
      items.push({ href: "/dashboard/agent-onboarding", label: "Агент баталгаажуулалт" });
    }

    items.push({ href: "/dashboard/settings", label: "Тохиргоо" });

    return items;
  }, [showAgentOnboarding, showLessons]);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOutAction();
    } catch {
      router.push("/auth");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-72 border-r border-slate-200 bg-white lg:block">
        <Sidebar pathname={pathname} role={role} navItems={navItems} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="h-full w-72 border-r border-slate-200 bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar
              pathname={pathname}
              role={role}
              navItems={navItems}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <MenuButton onClick={() => setMobileOpen(true)}>Цэс</MenuButton>
              <div>
                <div className="text-sm text-slate-500">Нэвтэрсэн хэрэглэгч</div>
                <div className="text-sm font-semibold text-slate-900">{email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                {credits} кредит
              </div>

              {role === "admin" ? (
                <Link
                  href="/admin"
                  className="hidden rounded-full bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 sm:inline-flex"
                >
                  Админ самбар
                </Link>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                >
                  {email.charAt(0).toUpperCase() || "U"}
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <div className="text-xs text-slate-500">Эрх</div>
                      <div className="text-sm font-medium text-slate-900">{roleLabel(role)}</div>
                    </div>
                    {role === "admin" ? (
                      <Link
                        href="/admin"
                        className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Админ самбар нээх
                      </Link>
                    ) : null}
                    <Link
                      href="/dashboard/billing"
                      className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Кредитийн хүсэлт
                    </Link>
                    {showAgentOnboarding ? (
                      <Link
                        href="/dashboard/agent-onboarding"
                        className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Агент баталгаажуулалт
                      </Link>
                    ) : null}
                    {showLessons ? (
                      <Link
                        href="/dashboard/lessons"
                        className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Хичээл
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {isSigningOut ? "Гарч байна..." : "Гарах"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
