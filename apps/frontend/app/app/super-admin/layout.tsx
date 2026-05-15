"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { Shield, LayoutDashboard, Users, CreditCard, AlertTriangle, Monitor, FileText, Settings, ChevronRight, Activity } from "lucide-react";

const adminNav = [
  { name: "Overview", href: "/app/super-admin", icon: LayoutDashboard },
  { name: "Organizations", href: "/app/super-admin/organizations", icon: Users },
  { name: "Billing", href: "/app/super-admin/billing", icon: CreditCard },
  { name: "Abuse Reports", href: "/app/super-admin/abuse", icon: AlertTriangle },
  { name: "Monitoring", href: "/app/super-admin/monitoring", icon: Monitor },
  { name: "Plans", href: "/app/super-admin/plans", icon: Activity },
  { name: "CMS", href: "/app/super-admin/cms", icon: FileText },
  { name: "Settings", href: "/app/super-admin/settings", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user?.is_super_admin && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You need admin privileges to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-[#12121a] border-r border-white/5 sticky top-0">
          <div className="p-6 border-b border-white/5">
            <Link href="/app/super-admin" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Super Admin</h2>
                <p className="text-xs text-gray-500">Platform Control</p>
              </div>
            </Link>
          </div>

          <nav className="p-4 space-y-1">
            {adminNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/app/super-admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
            <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">System Healthy</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}