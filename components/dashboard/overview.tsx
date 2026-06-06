"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  CreditCard,
  AlertTriangle,
  DollarSign,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────
type TableData = {
  id: string;
  number: number;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "CLEANING";
  currentOrderId: string | null;
  currentOrder?: {
    id: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
  } | null;
};

type DailyReport = {
  sales: {
    totalRevenue: number;
    totalTransactions: number;
  };
};

type KitchenOrders = {
  pending: Array<{ id: string; isDelayed: boolean }>;
  completed: Array<{ id: string }>;
};

// ── Fetchers ───────────────────────────────────────────────────────
async function fetchTables(): Promise<TableData[]> {
  const res = await fetch("/api/admin/tables");
  if (!res.ok) throw new Error("Failed to fetch tables");
  const data = await res.json();
  return data.tables;
}

async function fetchDailyReport(): Promise<DailyReport> {
  const res = await fetch("/api/reports/daily");
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
}

async function fetchKitchenOrders(): Promise<KitchenOrders> {
  const res = await fetch("/api/kitchen/orders");
  if (!res.ok) throw new Error("Failed to fetch kitchen orders");
  return res.json();
}

// ── Component ──────────────────────────────────────────────────────
export function OverviewDashboard() {
  const tables = useQuery({ queryKey: ["tables"], queryFn: fetchTables });
  const report = useQuery({ queryKey: ["dashboard", "report"], queryFn: fetchDailyReport });
  const kitchen = useQuery({ queryKey: ["dashboard", "kitchen"], queryFn: fetchKitchenOrders });

  // Compute quick stats
  const activeOrders = (kitchen.data?.pending?.length ?? 0);
  const pendingPayments = Array.isArray(tables.data) 
    ? tables.data.filter(t => t.currentOrder?.paymentStatus === "PENDING_CONFIRMATION").length 
    : 0;
  const delayedOrders = kitchen.data?.pending?.filter(o => o.isDelayed).length ?? 0;
  const todayRevenue = report.data?.sales?.totalRevenue ?? 0;

  const stats = [
    {
      title: "Active Orders",
      value: activeOrders,
      desc: "Orders currently in prep",
      icon: ClipboardList,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      border: "border-blue-500/20 dark:border-blue-500/30",
      glow: "group-hover:shadow-blue-500/10",
    },
    {
      title: "Pending Payments",
      value: pendingPayments,
      desc: "Awaiting checkout validation",
      icon: CreditCard,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/20 dark:border-amber-500/30",
      glow: "group-hover:shadow-amber-500/10",
    },
    {
      title: "Delayed Orders",
      value: delayedOrders,
      desc: "Prep time limit exceeded",
      icon: AlertTriangle,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-500/10 dark:bg-red-500/20",
      border: "border-red-500/20 dark:border-red-500/30",
      glow: "group-hover:shadow-red-500/10",
    },
    {
      title: "Today's Revenue",
      value: `$${todayRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      desc: "Completed payments total",
      icon: DollarSign,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/20 dark:border-emerald-500/30",
      glow: "group-hover:shadow-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card 
            key={stat.title} 
            className={cn(
              "relative overflow-hidden bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-1 group",
              stat.glow
            )}
          >
            <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-30", stat.color)} />
            <CardContent className="p-6">
              {kitchen.isLoading || report.isLoading ? (
                <Skeleton className="h-16 w-full rounded-xl" />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">{stat.desc}</p>
                  </div>
                  <div className={cn("size-12 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110", stat.bg, stat.border)}>
                    <stat.icon className={cn("size-5", stat.color)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Grid */}
      <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            Table Overview
            <Badge variant="outline" className="font-bold text-xs ml-2 rounded-full border-primary/20 bg-primary/5 text-primary relative flex items-center gap-1.5 pl-5">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full size-1.5 bg-primary"></span>
              </span>
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {tables.isLoading ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {(Array.isArray(tables.data) ? tables.data : []).map((table) => {
                const paymentPending = table.currentOrder?.paymentStatus === "PENDING_CONFIRMATION";

                let statusColor = "bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:shadow-emerald-500/5";
                let statusLabel = "Available";
                let dotColor = "bg-emerald-500";

                if (table.status === "OCCUPIED") {
                  if (paymentPending) {
                    statusColor = "bg-amber-500/10 border-amber-500/20 dark:border-amber-500/10 text-amber-700 dark:text-amber-400 hover:shadow-amber-500/5";
                    statusLabel = "Payment";
                    dotColor = "bg-amber-500 animate-pulse";
                  } else {
                    statusColor = "bg-rose-500/10 border-rose-500/20 dark:border-rose-500/10 text-rose-700 dark:text-rose-400 hover:shadow-rose-500/5";
                    statusLabel = "Occupied";
                    dotColor = "bg-rose-500";
                  }
                } else if (table.status === "CLEANING") {
                  statusColor = "bg-sky-500/10 border-sky-500/20 dark:border-sky-500/10 text-sky-700 dark:text-sky-400 hover:shadow-sky-500/5";
                  statusLabel = "Cleaning";
                  dotColor = "bg-sky-500";
                }

                return (
                  <div
                    key={table.id}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden group",
                      statusColor
                    )}
                  >
                    {/* Status dot */}
                    <span className={cn("absolute top-3 right-3 size-2.5 rounded-full shadow-sm", dotColor)} />

                    <span className="text-3xl font-black relative z-10 leading-none">{table.number}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest mt-2.5 relative z-10 opacity-80 flex items-center gap-1">
                      {statusLabel}
                    </span>

                    <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-muted-foreground relative z-10">
                      <Users className="size-3" />
                      <span>{table.capacity} Seats</span>
                    </div>

                    {table.currentOrder && (
                      <Badge variant="secondary" className="mt-3 text-[10px] font-black px-2.5 py-0.5 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/5 relative z-10">
                        ${Number(table.currentOrder.totalAmount).toFixed(0)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
            {[
              { color: "bg-emerald-500", label: "Available" },
              { color: "bg-rose-500", label: "Occupied" },
              { color: "bg-amber-500", label: "Payment Pending" },
              { color: "bg-sky-500", label: "Cleaning" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full shadow-inner", item.color)} />
                <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
