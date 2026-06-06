import { Metadata } from "next";
import { KitchenDisplay } from "@/components/dashboard/kitchen-display";

export const metadata: Metadata = {
  title: "Kitchen Display | FutureLink POS",
  description: "Manage pending and ready orders",
};

export default function KitchenPage() {
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex-none">
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Display</h1>
        <p className="text-muted-foreground">
          Monitor and manage orders in real-time.
        </p>
      </div>
      <KitchenDisplay />
    </div>
  );
}
