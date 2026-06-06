"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ChefHat,
  LayoutGrid,
  LayoutDashboard,
  BarChart3,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminRole } from "@/app/generated/prisma/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/dashboard/tables", label: "Tables", icon: LayoutGrid },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/waiters", label: "Waiters", icon: Users, managerOnly: true },
  { href: "/dashboard/admins", label: "Admins", icon: ShieldCheck, superAdminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ adminRole }: { adminRole: AdminRole | null }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => {
    if ("superAdminOnly" in item) return adminRole === "SUPER_ADMIN";
    if ("managerOnly" in item) return adminRole === "SUPER_ADMIN" || adminRole === "MANAGER";
    return true;
  });

  return (
    <aside className="hidden md:flex flex-col w-[260px] border-r border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl text-slate-800 dark:text-slate-200 transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200/50 dark:border-white/5">
        <div className="size-10 rounded-xl bg-gradient-to-br from-primary via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <ChefHat className="size-5 text-white drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-violet-600">
          FutureLink
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 pt-4">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "text-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5",
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl animate-fade-in" />
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <Icon className={cn(
                "size-5 shrink-0 transition-transform duration-300 z-10",
                isActive ? "text-primary scale-110" : "group-hover:scale-110"
              )} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Connection indicator */}
      <div className="px-6 py-4 border-t border-slate-200/50 dark:border-white/5">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-600">POS Admin v1.0.0</p>
      </div>
    </aside>
  );
}
