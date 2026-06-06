"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Users, Receipt, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderDetailModal } from "./order-detail-modal";
import { cn } from "@/lib/utils";

interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "CLEANING";
  currentOrderId: string | null;
  currentOrder: {
    id: string;
    status: string;
    paymentStatus: string;
    totalAmount: string;
    createdAt?: string;
  } | null;
}

export function TableGrid() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: tables = [], isLoading, error } = useQuery<TableData[]>({
    queryKey: ["tables"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tables");
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      return data.tables;
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 font-bold">
        Failed to load tables. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map((table) => {
          const isOccupied = table.status === "OCCUPIED";
          const paymentPending = table.currentOrder?.paymentStatus === "PENDING_CONFIRMATION";

          let borderTheme = "border-t-4 border-t-emerald-500";
          let bgTheme = "bg-emerald-500/5 dark:bg-emerald-500/10 hover:shadow-emerald-500/5";
          let badgeTheme = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
          let dotColor = "bg-emerald-500";

          if (table.status === "OCCUPIED") {
            if (paymentPending) {
              borderTheme = "border-t-4 border-t-amber-500";
              bgTheme = "bg-amber-500/5 dark:bg-amber-500/10 hover:shadow-amber-500/5";
              badgeTheme = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
              dotColor = "bg-amber-500 animate-pulse";
            } else {
              borderTheme = "border-t-4 border-t-rose-500";
              bgTheme = "bg-rose-500/5 dark:bg-rose-500/10 hover:shadow-rose-500/5";
              badgeTheme = "bg-rose-500/10 text-rose-700 dark:text-rose-400";
              dotColor = "bg-rose-500";
            }
          } else if (table.status === "CLEANING") {
            borderTheme = "border-t-4 border-t-sky-500";
            bgTheme = "bg-sky-500/5 dark:bg-sky-500/10 hover:shadow-sky-500/5";
            badgeTheme = "bg-sky-500/10 text-sky-700 dark:text-sky-400";
            dotColor = "bg-sky-500";
          }

          return (
            <Card
              key={table.id}
              className={cn(
                "relative overflow-hidden bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl group",
                borderTheme,
                bgTheme
              )}
              onClick={() => {
                if (table.currentOrderId) {
                  setSelectedOrderId(table.currentOrderId);
                }
              }}
            >
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-3xl font-black flex items-center gap-1.5 leading-none">
                  <span className="text-muted-foreground/30 text-xl font-bold">#</span>{table.number}
                </CardTitle>
                <Badge
                  className={cn("font-black uppercase tracking-widest text-[9px] px-2 py-0.5 border-none", badgeTheme)}
                  variant="outline"
                >
                  <span className={cn("size-1.5 rounded-full mr-1.5", dotColor)} />
                  {paymentPending ? "Payment" : table.status}
                </Badge>
              </CardHeader>
              <CardContent className="px-5 pb-5 relative z-10">
                <div className="flex items-center text-xs font-bold text-muted-foreground mb-4">
                  <Users className="w-3.5 h-3.5 mr-1.5 opacity-60" /> Capacity: {table.capacity} Guests
                </div>

                {isOccupied && table.currentOrder ? (
                  <div className="space-y-2.5 pt-4 border-t border-slate-200/50 dark:border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center text-xs font-semibold text-muted-foreground">
                        <Receipt className="w-3.5 h-3.5 mr-1.5 opacity-60" /> Total Bill
                      </span>
                      <span className="text-xl font-black text-gradient">
                        ${Number(table.currentOrder.totalAmount).toFixed(2)}
                      </span>
                    </div>
                    {table.currentOrder.paymentStatus !== "PENDING" && (
                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-xs font-semibold text-muted-foreground">Checkout</span>
                        <Badge variant="secondary" className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border-none">
                          {table.currentOrder.paymentStatus.replace("_", " ")}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-center h-[52px]">
                    <span className="text-muted-foreground/50 text-xs font-bold uppercase tracking-widest">
                      {table.status === "AVAILABLE" ? "Ready for Guests" : "Cleaning in progress"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}
