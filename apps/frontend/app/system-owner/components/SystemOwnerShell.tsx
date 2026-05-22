"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Mail,
  Cpu,
  LogOut,
  Zap,
  Building2,
  Wallet,
  Menu,
  X,
  Wrench,
  Bell,
  ChevronDown,
  ListOrdered,
  BarChart3,
  AlertTriangle,
  FileCode,
  Radio,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";

type NavItem = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
};

const NAV: NavItem[] = [
  { href: "/system-owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/system-owner/setup", label: "Setup", icon: Wrench },
  { href: "/system-owner/notifications", label: "Notifications", icon: Bell },
  { href: "/system-owner/plans", label: "Pricing Plans", icon: CreditCard },
  { href: "/system-owner/cms", label: "Landing Page", icon: FileText },
  { href: "/system-owner/payments", label: "Billing", icon: Wallet },
  { href: "/system-owner/smtp", label: "SMTP", icon: Mail },
  {
    label: "Email",
    icon: Zap,
    children: [
      { href: "/system-owner/email/queue", label: "Queue", icon: ListOrdered },
      { href: "/system-owner/email/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/system-owner/email/bounces", label: "Bounces", icon: AlertTriangle },
      { href: "/system-owner/email/templates", label: "Templates", icon: FileCode },
      { href: "/system-owner/email/triggers", label: "Triggers", icon: Radio },
    ],
  },
  { href: "/system-owner/settings", label: "AI & API", icon: Cpu },
  { href: "/system-owner/organizations", label: "Organizations", icon: Building2 },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const [emailOpen, setEmailOpen] = useState(
    () => pathname?.startsWith("/system-owner/email") ?? false
  );

  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;

        if (item.children) {
          const groupActive = pathname?.startsWith("/system-owner/email");
          return (
            <div key={item.label} className="space-y-1">
              <button
                type="button"
                onClick={() => setEmailOpen((o) => !o)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  groupActive
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </span>
                <ChevronDown
                  className={cn("w-4 h-4 shrink-0 transition-transform", emailOpen && "rotate-180")}
                />
              </button>
              {emailOpen && (
                <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          active
                            ? "text-purple-300 bg-purple-500/10"
                            : "text-gray-500 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const active =
          pathname === item.href || pathname?.startsWith((item.href || "") + "/");
        return (
          <Link
            key={item.href}
            href={item.href!}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function SystemOwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useSystemOwnerAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.push("/login");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col lg:flex-row">
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Log out?</h3>
            <p className="text-gray-400 text-sm mb-6">Are you sure you want to log out from your account?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelLogout}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors"
              >
                No, stay
              </button>
              <button
                onClick={confirmLogout}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0c0c14] shrink-0">
        <Link href="/system-owner/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">Outflo</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-gray-400"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-full lg:h-screen w-64 shrink-0 border-r border-white/10 bg-[#0c0c14] flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-white/10 hidden lg:block">
          <Link href="/system-owner/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Outflo</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">System Owner</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLinks pathname={pathname || ""} onNavigate={() => setMobileOpen(false)} />
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          {user?.email && (
            <p className="text-xs text-gray-500 truncate px-2" title={user.email}>
              {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="flex-1 min-w-0 w-full overflow-x-hidden">{children}</main>
    </div>
  );
}
