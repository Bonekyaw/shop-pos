import { Metadata } from "next";
import { PaymentQueue } from "@/components/dashboard/payment-queue";

export const metadata: Metadata = {
  title: "Orders & Payments | FutureLink POS",
  description: "Manage orders and confirm payments",
};

export default function OrdersPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Requests</h1>
        <p className="text-muted-foreground text-lg mt-1">
          Review and authorize pending payment requests from waiters.
        </p>
      </div>
      <div className="flex-1">
        <PaymentQueue />
      </div>
    </div>
  );
}
