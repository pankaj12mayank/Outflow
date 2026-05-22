"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  LogOut,
  Search,
  Building2,
  Layers,
  Flag,
  Globe,
  Bell,
  Bot,
  MessageSquare,
  Workflow,
  TrendingUp,
  TrendingDown,
  Home,
  HelpCircle,
  FileText,
  Star,
  ChevronLeft,
  Plus,
  Minus,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { usePermission } from "@/app/hooks/usePermission";
import { cn } from "@/app/lib/utils";
import { useState, useEffect } from "react";

const navigationCommon = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, permissions: [] },
  { name: "Leads", href: "/app/leads", icon: Users, permissions: ["leads:read"] },
  { name: "Scraping", href: "/app/scraping", icon: Search, permissions: ["scraping:read"] },
  { name: "Campaigns", href: "/app/campaigns", icon: Target, permissions: ["campaigns:read"] },
  { name: "Sequences", href: "/app/sequences", icon: Mail, permissions: ["sequences:read"] },
  { name: "AI Studio", href: "/app/ai", icon: Bot, permissions: [] },
  { name: "Automation", href: "/app/automation", icon: Workflow, permissions: [] },
  { name: "Inbox", href: "/app/inbox", icon: MessageSquare, permissions: [] },
  { name: "Calendar", href: "/app/calendar", icon: Calendar, permissions: [] },
  { name: "Analytics", href: "/app/analytics", icon: BarChart3, permissions: ["analytics:read"] },
];

const systemOwnerNav = [
  { name: "Organizations", href: "/system-owner/organizations", icon: Building2, permissions: ["organizations:read"] },
  { name: "Plans & Pricing", href: "/system-owner/plans", icon: Layers, permissions: ["plans:read"] },
  { name: "Features", href: "/system-owner/plans", icon: Flag, permissions: ["features:read"] },
  { name: "SMTP", href: "/system-owner/smtp", icon: Mail, permissions: ["smtp:read"] },
  { name: "Billing", href: "/system-owner/payments", icon: CreditCard, permissions: ["billing:read"] },
  { name: "Email", href: "/system-owner/email", icon: Mail, permissions: ["cms:read"] },
  { name: "Notifications", href: "/system-owner/notifications", icon: Bell, permissions: ["notifications:read"] },
  { name: "Settings", href: "/system-owner/settings", icon: Settings, permissions: ["settings:read"] },
  { name: "Dashboard", href: "/system-owner/dashboard", icon: BarChart3, permissions: ["analytics:read"] },
];

const settingsNavCommon = [
  { name: "Settings", href: "/app/settings", icon: Settings, permissions: [] },
  { name: "Billing", href: "/app/billing", icon: CreditCard, permissions: ["billing:read"] },
  { name: "Team", href: "/app/team", icon: Shield, permissions: ["teams:read"] },
];

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  children?: React.ReactNode;
  collapsed?: boolean;
  badge?: string | number;
  isActive?: boolean;
}

function NavItem({ href, icon: Icon, children, collapsed = false, badge, isActive = false }: NavItemProps) {
  return (
    <Link href={href} className="block" aria-label={typeof children === "string" ? children : href.split("/").pop() || "nav item"}>
      <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
          isActive
            ? "bg-[var(--color-purple-dim)] text-[var(--color-purple)] border border-[var(--color-purple)]/30"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] border border-transparent"
        )}
      >
        <div className={cn(
          "p-1.5 rounded-lg transition-all duration-200 flex-shrink-0",
          isActive 
            ? "bg-[var(--color-purple)]/20" 
            : "bg-transparent group-hover:bg-[var(--color-purple)]/10"
        )}>
          <Icon className={cn(
            "w-4 h-4 transition-colors",
            isActive ? "text-[var(--color-purple)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-purple)]"
          )} />
        </div>
        
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{children}</span>
            
            {badge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  isActive 
                    ? "bg-[var(--color-purple)] text-white" 
                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                )}
              >
                {badge}
              </motion.span>
            )}
            
            {isActive && (
              <motion.div 
                layoutId="nav-indicator"
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple)]" 
              />
            )}
          </>
        )}
      </motion.div>
    </Link>
  );
}

interface NavSectionProps {
  title?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsed?: boolean;
}

function NavSection({ title, children, defaultOpen = true, collapsed = false }: NavSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen && !collapsed);
  
  return (
    <div className="space-y-1">
      {title && (
        <motion.button
          whileHover={{ x: 2 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <motion.div
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3" />
          </motion.div>
          {!collapsed && <span>{title}</span>}
        </motion.button>
      )}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
}

function NotificationBadge({ count, maxCount = 99 }: NotificationBadgeProps) {
  if (count <= 0) return null;
  
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
    >
      {count > maxCount ? `${maxCount}+` : count}
    </motion.span>
  );
}

interface SidebarTooltipProps {
  children: React.ReactNode;
  content: string;
}

function SidebarTooltip({ children, content }: SidebarTooltipProps) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg whitespace-nowrap">
          <span className="text-xs text-[var(--color-text-primary)]">{content}</span>
        </div>
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-[var(--color-bg-elevated)]" />
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isSystemOwner, hasAnyPermission, role } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) setCollapsed(JSON.parse(savedCollapsed));
  }, []);

  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newValue));
  };

  const filteredNav = navigationCommon.filter(item => {
    if (item.permissions.length === 0) return true;
    return hasAnyPermission(item.permissions);
  });

  const filteredSettingsNav = settingsNavCommon.filter(item => {
    if (item.permissions.length === 0) return true;
    return hasAnyPermission(item.permissions);
  });

  const isOrgAdmin = role === "organization_admin";

  if (!mounted) return null;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        <motion.div animate={{ rotate: mobileOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={{
          x: 0,
          opacity: 1,
        }}
        className={cn(
          "fixed left-0 top-0 bottom-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col z-40",
          "transition-all duration-300 ease-out",
          collapsed ? "w-20" : "w-64",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Log out?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">Are you sure you want to log out from your account?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelLogout}
                className="px-5 py-2.5 rounded-xl bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] font-medium transition-colors"
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
      <div className={cn("flex flex-col h-full", collapsed && "items-center")}>
        <div className="p-4 border-b border-[var(--color-border)]">
          <Link href="/app/dashboard" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple-muted)] to-[var(--color-purple)] flex items-center justify-center shadow-lg shadow-[var(--color-purple-glow)] flex-shrink-0"
            >
              <Zap className="w-5 h-5 text-white" />
            </motion.div>
            {!collapsed && (
              <motion.span 
                className="text-xl font-bold text-[var(--color-text-primary)]"
                whileHover={{ x: 2 }}
              >
                Outflo
              </motion.span>
            )}
          </Link>
        </div>

        <div className="flex-1 p-3 overflow-y-auto scrollbar-thin">
          {!collapsed && (
            <div className="mb-4 px-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full h-9 pl-9 pr-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-purple)] transition-colors"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded text-xs text-[var(--color-text-muted)]">
                  ⌘K
                </kbd>
              </div>
            </div>
          )}

          <NavSection collapsed={collapsed}>
            {filteredNav.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                {collapsed ? (
                  <SidebarTooltip content={item.name}>
                    <NavItem href={item.href} icon={item.icon} collapsed={collapsed} />
                  </SidebarTooltip>
                ) : (
                  <NavItem 
                    href={item.href} 
                    icon={item.icon} 
                    collapsed={collapsed}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  />
                )}
              </motion.div>
            ))}
          </NavSection>
          
          {isSystemOwner() && (
            <NavSection title="System Admin" defaultOpen={false} collapsed={collapsed}>
              {systemOwnerNav.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {collapsed ? (
                    <SidebarTooltip content={item.name}>
                      <NavItem href={item.href} icon={item.icon} collapsed={collapsed} />
                    </SidebarTooltip>
                  ) : (
                    <NavItem 
                      href={item.href} 
                      icon={item.icon} 
                      collapsed={collapsed}
                      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                    />
                  )}
                </motion.div>
              ))}
            </NavSection>
          )}
        </div>

        <div className="p-3 border-t border-[var(--color-border)] space-y-2">
          <NavSection defaultOpen={false} collapsed={collapsed}>
            {filteredSettingsNav.map((item) => (
              <NavItem 
                key={item.name} 
                href={item.href} 
                icon={item.icon}
                collapsed={collapsed}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
              />
            ))}
          </NavSection>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all"
          >
            {collapsed ? (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogoutClick}
                className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-purple-muted)] to-[var(--color-purple)] flex items-center justify-center font-bold text-sm text-white shadow-lg flex-shrink-0"
                  >
                    {user?.full_name?.charAt(0) || "U"}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {user?.full_name || "User"}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] capitalize">
                      {role?.replace("_", " ") || "Team Member"}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogoutClick}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </motion.button>
              </>
            )}
          </motion.div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleCollapsed}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] transition-all shadow-lg"
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </div>
    </motion.aside>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Sidebar />
      <main className="md:pl-64 pl-0">
        <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-full overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}