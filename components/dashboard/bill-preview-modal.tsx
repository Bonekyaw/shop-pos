"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle, Printer } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ReceiptGenerator } from "./receipt-generator";

interface BillPreviewModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BillPreviewModal({ orderId, isOpen, onClose }: BillPreviewModalProps) {
  const queryClient = useQueryClient();
  const [receiptData, setReceiptData] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      return res.json();
    },
    enabled: !!orderId && isOpen && !receiptData,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payment/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to confirm payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Payment confirmed successfully");
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setReceiptData(data.receipt); // Show receipt view
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payment/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reject payment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payment request rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleClose = () => {
    setReceiptData(null);
    onClose();
  };

  // If receipt data is present, show the Receipt Generator instead of the preview
  if (receiptData) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-slate-100">
          <div className="flex justify-end p-2 bg-white border-b">
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
          </div>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-6 flex justify-center">
              <ReceiptGenerator receipt={receiptData} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  const order = data?.order;
  const subtotal = order?.items.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0) || 0;
  const tax = subtotal * 0.05; // Assuming 5% tax from API
  const total = subtotal + tax;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-bold">Review Bill</DialogTitle>
          <DialogDescription>
            {order?.table ? `Table ${order.table.number}` : 'Takeaway'} • Served by {order?.waiter?.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] px-6 py-4">
            <div className="space-y-4">
              {/* Itemized List */}
              <div className="space-y-3">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex gap-2">
                      <span className="font-medium text-slate-500">{item.quantity}x</span>
                      <span>{item.menuItem.name}</span>
                    </div>
                    <span className="font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (5%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t text-foreground">
                  <span>Grand Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/50 flex sm:justify-between items-center gap-2">
          <Button 
            variant="outline"
            className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            disabled={isLoading || confirmMutation.isPending || rejectMutation.isPending}
            onClick={() => rejectMutation.mutate()}
          >
            {rejectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
            Reject
          </Button>
          <Button 
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading || confirmMutation.isPending || rejectMutation.isPending}
            onClick={() => confirmMutation.mutate()}
          >
            {confirmMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
