"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutAction } from "@/app/dashboard/actions";

// ─── Icons ───────────────────────────────────────────────────────────────────
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function CreditRequestsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="22" height="16" x="1" y="4" rx="2" ry="2" />
      <line x1="1" x2="23" y1="10" y2="10" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  exact: boolean;
  disabled?: boolean;
};

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Нүүр", icon: HomeIcon, exact: true },
  { href: "/admin/credits", label: "Кредит хүсэлтүүд", icon: CreditRequestsIcon, exact: false },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: UsersIcon, exact: false, disabled: true },
  { href: "/admin/settings", label: "Тохиргоо", icon: SettingsIcon, exact: false, disabled: true },
];

function SidebarNav({
  pathname,
  email,
  onNavigate,
}: {
  pathname: string;
  email: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 lg:px-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold text-sm">P</span>
          </div>
          <div>
            <span className="font-semibold text-lg text-gray-900 leading-none">Postly</span>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldIcon className="w-3 h-3 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-3">Цэс</p>
        {adminNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 cursor-not-allowed"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
                <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Удахгүй</span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="px-3 pb-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Хэрэглэгч руу буцах
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="text-xs text-gray-500 mb-2">Admin workspace</div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-purple-700 font-medium text-sm">
              {email ? email[0].toUpperCase() : "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{email || "Admin"}</div>
            <div className="flex items-center gap-1">
              <ShieldIcon className="w-3 h-3 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">Administrator</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayoutClient({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const handler = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setUserMenuOpen(false);
    try {
      await signOutAction();
    } catch {
      // redirect() throws; client navigates below
    }
    router.push("/auth");
    router.refresh();
    setIsSigningOut(false);
  };

  const currentItem = adminNavItems.find((n) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href)
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0">
        <SidebarNav pathname={pathname} email={email} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col lg:hidden transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <SidebarNav
          pathname={pathname}
          email={email}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="font-semibold text-gray-900 hidden sm:block">
              {currentItem?.label ?? "Admin"}
            </span>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Admin badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-sm font-medium">
              <ShieldIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin панел</span>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUserMenuOpen((v) => !v);
                }}
                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-gray-600" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-900">Admin</p>
                    <p className="text-xs text-gray-500 truncate">{email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <HomeIcon className="w-4 h-4" />
                    Хэрэглэгч рүү буцах
                  </Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <LogOutIcon className="w-4 h-4" />
                      {isSigningOut ? "Гарах..." : "Гарах"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
