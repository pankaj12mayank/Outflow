"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Target,
  Mail,
  Calendar,
  BarChart3,
  Settings,
  CreditCard,
  Shield,
  Zap,
  ChevronDown,
  LogOut,
  Search,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { cn } from "@/app/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/app/leads", icon: Users },
  { name: "Scraping", href: "/app/scraping", icon: Search },
  { name: "Campaigns", href: "/app/campaigns", icon: Target },
  { name: "Sequences", href: "/app/sequences", icon: Mail },
  { name: "AI", href: "/app/ai", icon: Zap },
  { name: "Calendar", href: "/app/calendar", icon: Calendar },
  { name: "Analytics", href: "/app/analytics", icon: BarChart3 },
];

const settingsNav = [
  { name: "Settings", href: "/app/settings", icon: Settings },
  { name: "Billing", href: "/app/billing", icon: CreditCard },
  { name: "Team", href: "/app/team", icon: Shield },
];

function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: any;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
        isActive
          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-[var(--color-bg-secondary)] flex flex-col">
      <div className="p-6 border-b border-white/5">
        <Link href="/app/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">Outflo</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavItem key={item.name} href={item.href} icon={item.icon}>
            {item.name}
          </NavItem>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="mb-4">
          {settingsNav.map((item) => (
            <NavItem key={item.name} href={item.href} icon={item.icon}>
              {item.name}
            </NavItem>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name || "User"}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email || ""}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Sidebar />
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}