"use client";

import { useEffect, useState } from "react";
import { Bell, WifiOff, LogOut, User, Sun, Moon, Menu as MenuIcon, X, ChefHat, Settings } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { SERVER_EVENT_CHANNEL, type ServerEventPayload } from "@shared/socket-events";
import { authClient } from "@/lib/auth-client";
import type { AdminRole } from "@/app/generated/prisma/client";
import { ADMIN_ROLE_LABELS } from "@/lib/auth/permissions";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: ChefHat }, // Overview
  { href: "/dashboard/orders", label: "Orders", icon: ChefHat },
  { href: "/dashboard/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/dashboard/tables", label: "Tables", icon: ChefHat },
  { href: "/dashboard/reports", label: "Reports", icon: ChefHat },
  { href: "/dashboard/waiters", label: "Waiters", icon: ChefHat, managerOnly: true },
  { href: "/dashboard/admins", label: "Admins", icon: ChefHat, superAdminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: ChefHat },
] as const;

export function Topbar({ userName, adminRole }: { userName: string; adminRole: AdminRole | null }) {
  const { socket, isConnected } = useSocket();
  const [pendingPayments, setPendingPayments] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for realtime events to trigger refetches
  useEffect(() => {
    if (!socket) return;

    function handleEvent(payload: ServerEventPayload) {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen"] });

      if (payload.type === "PAYMENT_REQUESTED") {
        setPendingPayments((prev) => prev + 1);
      }
      if (payload.type === "PAYMENT_CONFIRMED") {
        setPendingPayments((prev) => Math.max(0, prev - 1));
      }
    }

    socket.on(SERVER_EVENT_CHANNEL, handleEvent);
    return () => {
      socket.off(SERVER_EVENT_CHANNEL, handleEvent);
    };
  }, [socket, queryClient]);

  async function handleLogout() {
    await authClient.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if ("superAdminOnly" in item) return adminRole === "SUPER_ADMIN";
    if ("managerOnly" in item) return adminRole === "SUPER_ADMIN" || adminRole === "MANAGER";
    return true;
  });

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40 transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Toggle mobile menu"
        >
          <MenuIcon className="size-5" />
        </Button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 transition-all duration-300">
          {isConnected ? (
            <>
              <div className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="size-3.5 text-destructive" />
              <span className="text-xs font-bold text-destructive">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Right side: theme selector + notifications + user dropdown */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? (
            <Sun className="size-5 text-amber-500" />
          ) : (
            <Moon className="size-5 text-slate-600 dark:text-slate-300" />
          )}
        </Button>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => router.push("/dashboard/orders")}
          aria-label="Notifications"
        >
          <Bell className="size-5 text-slate-600 dark:text-slate-300" />
          {pendingPayments > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-0 right-0 size-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
            >
              {pendingPayments}
            </Badge>
          )}
        </Button>

        {/* User Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 md:pl-4 border-l border-slate-200 dark:border-slate-800 text-left outline-none cursor-pointer group"
          >
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-violet-600 p-[2px] shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <div className="size-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                <User className="size-4 text-primary" />
              </div>
            </div>
            <div className="hidden lg:block">
              <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">
                {userName}
              </span>
              {adminRole && (
                <div className="text-[11px] font-semibold text-muted-foreground leading-none mt-0.5">
                  {ADMIN_ROLE_LABELS[adminRole]}
                </div>
              )}
            </div>
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-2 shadow-2xl z-50 animate-slide-up">
                <div className="px-3.5 py-3 border-b border-slate-100 dark:border-white/5 lg:hidden mb-2">
                  <div className="font-bold text-sm">{userName}</div>
                  {adminRole && (
                    <div className="text-[10px] font-bold text-muted-foreground mt-0.5">
                      {ADMIN_ROLE_LABELS[adminRole]}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/dashboard/settings");
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-all text-left"
                >
                  <Settings className="size-4" />
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-all text-left mt-1"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Content */}
          <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-950 p-6 shadow-2xl border-r border-slate-200/50 dark:border-white/5 flex flex-col justify-between animate-slide-up">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md">
                    <ChefHat className="size-4.5 text-white" />
                  </div>
                  <span className="font-black text-xl text-gradient">FutureLink</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </Button>
              </div>

              {/* Nav Items */}
              <nav className="flex flex-col gap-1">
                {visibleItems.map(({ href, label }) => {
                  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200",
                        isActive
                          ? "text-primary bg-primary/10 dark:bg-primary/20"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <span className="relative z-10">{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Version */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 text-xs font-bold text-slate-400">
              POS Admin v1.0.0
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
