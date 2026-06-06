"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface OrderDetailModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface OrderDetail {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  type: string;
  createdAt: string;
  table?: { number: number };
  waiter: { name: string };
  items: {
    id: string;
    quantity: number;
    price: string;
    status: string;
    notes?: string;
    menuItem: { name: string };
  }[];
  auditLogs: {
    id: string;
    action: string;
    timestamp: string;
    user: { name: string };
  }[];
}

export function OrderDetailModal({ orderId, isOpen, onClose }: OrderDetailModalProps) {
  const { data, isLoading } = useQuery<{ order: OrderDetail }>({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json();
    },
    enabled: !!orderId && isOpen,
    refetchInterval: 5000, // Poll every 5s for real-time updates
  });

  const order = data?.order;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              Order {order?.table ? `Table ${order.table.number}` : 'Details'}
              {order && (
                <Badge variant={order.status === 'COMPLETED' ? 'default' : 'secondary'} className="ml-2">
                  {order.status}
                </Badge>
              )}
            </DialogTitle>
            <div className="text-sm text-muted-foreground mr-8">
              {order?.createdAt && format(new Date(order.createdAt), "h:mm a")}
            </div>
          </div>
          <DialogDescription>
            {order ? `Served by ${order.waiter.name} • ${order.type.replace('_', ' ')}` : "Loading order details..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="flex-1 flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Items</h3>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-medium">
                          {item.quantity}x {item.menuItem.name}
                        </div>
                        {item.notes && (
                          <div className="text-sm text-muted-foreground mt-1">Note: {item.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                        <Badge variant="outline" className={`
                          ${item.status === 'PENDING' ? 'bg-slate-100' : ''}
                          ${item.status === 'COOKING' ? 'bg-amber-100 text-amber-800' : ''}
                          ${item.status === 'READY' ? 'bg-emerald-100 text-emerald-800' : ''}
                          ${item.status === 'DELIVERED' ? 'bg-blue-100 text-blue-800' : ''}
                        `}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center text-lg font-bold border-t pt-4">
                  <span>Total Amount</span>
                  <span>${Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Audit Trail */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Audit Trail
                </h3>
                <div className="space-y-2">
                  {order.auditLogs.map((log) => (
                    <div key={log.id} className="text-sm flex gap-2">
                      <span className="text-muted-foreground w-16">{format(new Date(log.timestamp), "HH:mm")}</span>
                      <span className="font-medium">{log.user.name}</span>
                      <span className="text-slate-600">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                  {order.auditLogs.length === 0 && (
                    <div className="text-sm text-muted-foreground">No audit logs available.</div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/50 flex-row justify-between sm:justify-between items-center">
          <Button variant="destructive" size="sm" disabled={isLoading || order?.status === 'COMPLETED'}>
            <XCircle className="w-4 h-4 mr-2" /> Cancel Order
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Printer className="w-4 h-4 mr-2" /> Print Bill
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={isLoading || order?.paymentStatus === 'CONFIRMED'}>
              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Payment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
