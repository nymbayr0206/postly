"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { PostlyLogo } from "@/components/brand/postly-logo";
import { signOutAction } from "@/app/dashboard/actions";
import type { UserRole } from "@/lib/types";

type NavKey =
  | "home"
  | "image"
  | "gallery"
  | "video"
  | "audio"
  | "history"
  | "billing"
  | "settings"
  | "lessons"
  | "agent"
  | "admin";

type NavItem = {
  href: string;
  label: string;
  key: NavKey;
  exact?: boolean;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function formatCredits(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

function NavIcon({
  navKey,
  active,
  tone = "default",
}: {
  navKey: NavKey;
  active?: boolean;
  tone?: "default" | "mobile-bottom";
}) {
  const className = cx(
    "h-[18px] w-[18px]",
    tone === "mobile-bottom"
      ? active
        ? "text-slate-950"
        : "text-slate-400"
      : active
        ? "text-white"
        : "text-slate-500",
  );

  switch (navKey) {
    case "home":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9.8V20h14V9.8" />
        </svg>
      );
    case "image":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="m21 15-4.5-4.5a2 2 0 0 0-2.8 0L5 19" />
        </svg>
      );
    case "gallery":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "video":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="14" height="14" rx="2" />
          <path d="m17 10 4-2.5v9L17 14" />
        </svg>
      );
    case "audio":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "history":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "billing":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="3" />
          <path d="M2 10h20" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2.5 14 4l2.5-.3 1 2.3 2.2 1-.3 2.5L21.5 12 20 14l.3 2.5-2.3 1-1 2.2-2.5-.3L12 21.5 10 20l-2.5.3-1-2.3-2.2-1 .3-2.5L2.5 12 4 10l-.3-2.5 2.3-1 1-2.2 2.5.3L12 2.5Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "lessons":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5V4.5A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      );
    case "agent":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 2 7 4v6c0 4.5-2.7 8.5-7 10-4.3-1.5-7-5.5-7-10V6l7-4Z" />
          <path d="m9.5 12 1.5 1.5 3.5-3.5" />
        </svg>
      );
    case "admin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3 4 7v5c0 5 3.5 9.4 8 10 4.5-.6 8-5 8-10V7l-8-4Z" />
        </svg>
      );
    default:
      return null;
  }
}

function NavLink({
  item,
  pathname,
  onNavigate,
  compact = false,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cx(
        "group flex items-center gap-3 rounded-2xl transition",
        compact
          ? active
            ? "bg-white/14 px-3 py-3 text-white"
            : "px-3 py-3 text-slate-300 hover:bg-white/8 hover:text-white"
          : active
            ? "bg-[linear-gradient(135deg,rgba(132,224,239,0.2),rgba(47,188,230,0.16))] px-4 py-3 text-white"
            : "px-4 py-3 text-slate-300 hover:bg-white/8 hover:text-white",
      )}
    >
      <div
        className={cx(
          "flex h-9 w-9 items-center justify-center rounded-xl border",
          active
            ? "border-white/12 bg-white/12"
            : "border-white/8 bg-white/[0.04] group-hover:border-white/14 group-hover:bg-white/[0.08]",
        )}
      >
        <NavIcon navKey={item.key} active={active} />
      </div>
      <div className="min-w-0">
        <div className={cx("truncate text-sm font-semibold", active ? "text-white" : "")}>{item.label}</div>
      </div>
    </Link>
  );
}

function DesktopSidebar({
  pathname,
  role,
  email,
  credits,
  navItems,
}: {
  pathname: string;
  role: UserRole;
  email: string;
  credits: number;
  navItems: NavItem[];
}) {
  return (
    <div className="brand-shell brand-grid flex h-full flex-col rounded-r-[2rem] px-4 py-5 text-white">
      <div className="px-1 py-1">
        <PostlyLogo showTagline tone="light" />
      </div>

      <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Навигаци</div>
      <nav className="mt-3 space-y-2">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {role === "admin" ? (
          <NavLink item={{ href: "/admin", label: "Админ самбар", key: "admin" }} pathname={pathname} />
        ) : null}
      </nav>

      <div className="mt-auto rounded-[28px] border border-white/10 bg-white/[0.06] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Данс</div>
        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-black text-white">
            {email.charAt(0).toUpperCase() || "P"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{email}</div>
            <div className="mt-1 text-xs text-slate-300">{roleLabel(role)}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="text-xs text-slate-400">Нийт кредит</div>
          <div className="mt-1 text-xl font-black text-white">{formatCredits(credits)}</div>
        </div>
      </div>
    </div>
  );
}

function MobileDrawer({
  pathname,
  role,
  email,
  credits,
  navItems,
  onClose,
  onSignOut,
  isSigningOut,
}: {
  pathname: string;
  role: UserRole;
  email: string;
  credits: number;
  navItems: NavItem[];
  onClose: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="brand-shell absolute inset-y-0 left-0 flex w-[86vw] max-w-[360px] flex-col rounded-r-[2rem] px-4 py-5 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <PostlyLogo showTagline tone="light" compact />
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8"
          >
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
          <div className="text-xs text-slate-300">Нэвтэрсэн хэрэглэгч</div>
          <div className="mt-1 truncate text-sm font-semibold text-white">{email}</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-slate-200">
              {roleLabel(role)}
            </span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              {formatCredits(credits)} кредит
            </span>
          </div>
        </div>

        <nav className="mt-5 space-y-2 overflow-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onClose} compact />
          ))}
          {role === "admin" ? (
            <NavLink
              item={{ href: "/admin", label: "Админ самбар", key: "admin" }}
              pathname={pathname}
              onNavigate={onClose}
              compact
            />
          ) : null}
        </nav>

        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="mt-auto flex items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-100"
        >
          {isSigningOut ? "Гарч байна..." : "Гарах"}
        </button>
      </aside>
    </div>
  );
}

function MobileBottomNav({
  pathname,
  navItems,
}: {
  pathname: string;
  navItems: NavItem[];
}) {
  const bottomItems = navItems.filter((item) =>
    ["/dashboard", "/dashboard/image", "/dashboard/video", "/dashboard/audio", "/dashboard/billing"].includes(item.href),
  );

  return (
    <div className="mobile-nav-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(5,13,22,0.96)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-2">
        {bottomItems.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition",
                active
                  ? "bg-white text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <NavIcon navKey={item.key} active={active} tone="mobile-bottom" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
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
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navItems = useMemo(() => {
    const items: NavItem[] = [
      { href: "/dashboard", label: "Ерөнхий", key: "home", exact: true },
      { href: "/dashboard/image", label: "Зураг", key: "image" },
      { href: "/dashboard/gallery", label: "Галерей", key: "gallery" },
      { href: "/dashboard/video", label: "Видео", key: "video" },
      { href: "/dashboard/audio", label: "Аудио", key: "audio" },
    ];

    if (showLessons) {
      items.push({ href: "/dashboard/lessons", label: "Хичээл", key: "lessons" });
    }

    items.push(
      { href: "/dashboard/history", label: "Түүх", key: "history" },
      { href: "/dashboard/billing", label: "Кредит", key: "billing" },
    );

    if (showAgentOnboarding) {
      items.push({ href: "/dashboard/agent-onboarding", label: "Агент баталгаажуулалт", key: "agent" });
    }

    items.push({ href: "/dashboard/settings", label: "Тохиргоо", key: "settings" });
    return items;
  }, [showAgentOnboarding, showLessons]);

  const currentItem = navItems.find((item) => isActive(pathname, item));

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/billing")) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.prefetch("/dashboard/billing");
      router.prefetch("/dashboard/billing?tab=referral");
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, router]);

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
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-[300px] shrink-0 lg:block">
        <DesktopSidebar pathname={pathname} role={role} email={email} credits={credits} navItems={navItems} />
      </aside>

      {mobileOpen ? (
        <MobileDrawer
          pathname={pathname}
          role={role}
          email={email}
          credits={credits}
          navItems={navItems}
          onClose={() => setMobileOpen(false)}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="brand-surface flex h-11 w-11 items-center justify-center rounded-2xl lg:hidden"
              >
                <svg className="h-4 w-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </button>
              <div className="lg:hidden">
                <PostlyLogo compact />
              </div>
              <div className="hidden min-w-0 lg:block">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Хуудас</div>
                <div className="truncate text-lg font-semibold text-slate-950">
                  {currentItem?.label ?? "Postly"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="brand-surface rounded-full px-3 py-2 text-xs font-semibold text-slate-700 sm:px-4 sm:text-sm">
                {formatCredits(credits)} кредит
              </div>

              <div className="hidden items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-2 py-1.5 shadow-sm sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8EE8F1,#2FBCE6)] text-sm font-black text-slate-950">
                  {email.charAt(0).toUpperCase() || "P"}
                </div>
                <div className="max-w-[220px]">
                  <div className="truncate text-xs text-slate-500">{roleLabel(role)}</div>
                  <div className="truncate text-sm font-semibold text-slate-900">{email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  {isSigningOut ? "..." : "Гарах"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="safe-bottom min-w-0 flex-1">{children}</main>
      </div>

      <MobileBottomNav pathname={pathname} navItems={navItems} />
    </div>
  );
}
