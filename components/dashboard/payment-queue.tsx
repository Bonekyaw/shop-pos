"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock, User, FileText, CheckCircle2, Wallet, CreditCard, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BillPreviewModal } from "./bill-preview-modal";
import { cn } from "@/lib/utils";

interface PendingPayment {
  id: string;
  totalAmount: string;
  createdAt: string;
  table?: { number: number };
  waiter: { name: string };
  payments: {
    id: string;
    amount: string;
    method: string;
    createdAt: string;
  }[];
}

export function PaymentQueue() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ orders: PendingPayment[] }>({
    queryKey: ["pending-payments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments");
      if (!res.ok) throw new Error("Failed to fetch pending payments");
      return res.json();
    },
    refetchInterval: 5000,
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
        Failed to load payment requests.
      </div>
    );
  }

  const orders = data?.orders || [];

  return (
    <>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-dashed border-slate-200 dark:border-white/5 text-slate-500">
            <CheckCircle2 className="w-14 h-14 mb-4 text-emerald-500/60 animate-pulse" />
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">All payments processed!</p>
            <p className="text-sm text-muted-foreground mt-1">No pending verification requests at this time.</p>
          </div>
        ) : (
          orders.map((order) => {
            const payment = order.payments[0]; // Assuming at least one pending payment exists
            
            // Method badge styling
            let methodIcon = Wallet;
            let methodStyle = "bg-blue-500/10 text-blue-700 dark:text-blue-400";
            if (payment?.method === "CARD") {
              methodIcon = CreditCard;
              methodStyle = "bg-purple-500/10 text-purple-700 dark:text-purple-400";
            } else if (payment?.method === "CASH") {
              methodIcon = DollarSign;
              methodStyle = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
            }

            const MethodIconComponent = methodIcon;

            return (
              <Card key={order.id} className="overflow-hidden bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-center justify-between p-5 md:p-6 gap-6 relative">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-primary rounded-r-lg" />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-5 w-full md:w-auto z-10">
                      {/* Table Number Block */}
                      <div className="flex flex-col items-center justify-center size-20 rounded-2xl bg-slate-100 dark:bg-slate-850 text-foreground border border-slate-200/30 dark:border-slate-700/30 shadow-inner">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Table</span>
                        <span className="text-3xl font-black">{order.table?.number || '--'}</span>
                      </div>
                      
                      {/* Bill details */}
                      <div className="space-y-2 text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                          <span className="text-3xl font-black text-gradient leading-none">
                            ${Number(payment?.amount || order.totalAmount).toFixed(2)}
                          </span>
                          <Badge variant="outline" className={cn("font-bold tracking-wide border-none flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px]", methodStyle)}>
                            <MethodIconComponent className="size-3" />
                            {payment?.method || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5 opacity-70" />
                            <span>Staff: {order.waiter.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 opacity-70" />
                            <span>Requested: {payment ? format(new Date(payment.createdAt), "h:mm a") : ''}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Bill Action */}
                    <div className="w-full md:w-auto z-10 flex justify-end">
                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto font-bold tracking-wide bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all duration-300 rounded-xl"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <FileText className="w-4.5 h-4.5 mr-2" />
                        Review Transaction
                      </Button>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <BillPreviewModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}
