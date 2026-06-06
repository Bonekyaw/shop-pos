"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle, CheckCircle, Clock, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  quantity: number;
  status: string;
  notes?: string;
  isDelayed: boolean;
  preparationTime: number;
  menuItem: { name: string };
}

interface KitchenOrder {
  id: string;
  status: string;
  type: string;
  timeElapsedMinutes: number;
  isDelayed: boolean;
  table?: { number: number };
  items: OrderItem[];
}

export function KitchenDisplay() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ pending: KitchenOrder[], completed: KitchenOrder[] }>({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      const res = await fetch("/api/kitchen/orders");
      if (!res.ok) throw new Error("Failed to fetch kitchen orders");
      return res.json();
    },
    refetchInterval: 15000, // Refresh every 15s for better responsiveness
  });

  const updateItemStatus = useMutation({
    mutationFn: async ({ orderId, itemId, status }: { orderId: string, itemId: string, status: string }) => {
      const res = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingOrders = data?.pending || [];
  const readyOrders = data?.completed || [];

  const renderOrderCard = (order: KitchenOrder, isPendingView: boolean) => {
    const isOrderDelayed = order.isDelayed && isPendingView;
    return (
      <Card
        key={order.id}
        className={cn(
          "mb-6 overflow-hidden border border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900 shadow-md transition-all duration-300 relative group",
          isOrderDelayed
            ? "border-l-4 border-l-red-500 shadow-red-500/5 dark:shadow-red-500/10"
            : "border-l-4 border-l-primary shadow-slate-200/30 dark:shadow-black/20"
        )}
      >
        <CardHeader className="py-4 px-5 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2 tracking-tight">
              {order.table ? `Table ${order.table.number}` : 'Takeaway'}
              {isOrderDelayed && (
                <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
              )}
            </CardTitle>
            <div className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Received {order.timeElapsedMinutes}m ago</span>
            </div>
          </div>
          <Badge
            variant={isPendingView ? (order.isDelayed ? 'destructive' : 'secondary') : 'default'}
            className="font-black tracking-widest text-[10px] px-2.5 shadow-xs border-none"
          >
            {order.status}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-white/5 font-mono text-sm">
            {order.items.map(item => {
              const isItemDelayed = item.isDelayed && ['PENDING', 'COOKING'].includes(item.status);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                    isItemDelayed && isPendingView ? 'bg-red-500/5 dark:bg-red-500/10' : ''
                  )}
                >
                  <div className="flex-1 space-y-1">
                    <div className="font-bold flex items-center flex-wrap gap-2 text-foreground">
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 rounded-lg text-xs font-black">
                        {item.quantity}x
                      </span>
                      <span className="text-sm font-bold tracking-tight">{item.menuItem.name}</span>
                      {isItemDelayed && (
                        <Badge variant="destructive" className="text-[9px] font-black h-4 px-1.5 leading-none">
                          OVERDUE
                        </Badge>
                      )}
                    </div>
                    {item.notes && (
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 pl-8 italic">
                        * Note: {item.notes}
                      </div>
                    )}
                  </div>

                  {isPendingView ? (
                    <div className="flex gap-2 shrink-0 self-end sm:self-center">
                      {item.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold text-xs"
                          onClick={() => updateItemStatus.mutate({ orderId: order.id, itemId: item.id, status: 'COOKING' })}
                          disabled={updateItemStatus.isPending}
                        >
                          Start Prep
                        </Button>
                      )}
                      {['PENDING', 'COOKING'].includes(item.status) && (
                        <Button
                          size="sm"
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                          onClick={() => updateItemStatus.mutate({ orderId: order.id, itemId: item.id, status: 'READY' })}
                          disabled={updateItemStatus.isPending}
                        >
                          Mark Ready
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 font-black text-[10px] self-end sm:self-center">
                      {item.status}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          {/* Thermal receipt jagged bottom visual */}
          <div className="h-1 bg-[radial-gradient(circle_at_bottom,_transparent_2px,_#cbd5e1_3px)] dark:bg-[radial-gradient(circle_at_bottom,_transparent_2px,_#334155_3px)] bg-[length:8px_4px] opacity-40" />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
      {/* Left Panel: Pending Orders */}
      <div className="flex flex-col h-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-white/5 font-black text-xl flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Utensils className="size-5 text-primary" />
            <span className="text-gradient">Active Prep Queue</span>
          </div>
          <Badge variant="secondary" className="px-3 py-1 text-xs font-black shadow-inner">
            {pendingOrders.length}
          </Badge>
        </div>
        <ScrollArea className="flex-1 p-6 bg-slate-50/10 dark:bg-slate-900/10">
          {pendingOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 animate-fade-in">
              <CheckCircle className="w-16 h-16 mb-4 opacity-25 text-emerald-500" />
              <p className="font-bold text-lg">Queue is empty!</p>
              <p className="text-sm text-muted-foreground mt-1">All kitchen orders are ready.</p>
            </div>
          ) : (
            <div className="animate-slide-up">
              {pendingOrders.map(order => renderOrderCard(order, true))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel: Ready for Delivery */}
      <div className="flex flex-col h-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-white/5 font-black text-xl flex justify-between items-center">
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-400">
            <CheckCircle className="size-5" />
            <span>Ready for Counter</span>
          </div>
          <Badge className="bg-emerald-600 hover:bg-emerald-600 shadow-sm px-3 py-1 text-xs font-black">
            {readyOrders.length}
          </Badge>
        </div>
        <ScrollArea className="flex-1 p-6 bg-slate-50/10 dark:bg-slate-900/10">
          {readyOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 animate-fade-in">
              <p className="font-bold text-lg opacity-40">No orders ready to serve</p>
              <p className="text-sm text-muted-foreground mt-1">Orders will appear here once cooked.</p>
            </div>
          ) : (
            <div className="animate-slide-up">
              {readyOrders.map(order => renderOrderCard(order, false))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
