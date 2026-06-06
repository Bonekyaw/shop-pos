import { Metadata } from "next";
import { TableGrid } from "@/components/dashboard/table-grid";

export const metadata: Metadata = {
  title: "Tables | FutureLink POS",
  description: "Manage restaurant tables and orders",
};

export default function TablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tables</h1>
        <p className="text-muted-foreground text-lg mt-1">
          Monitor table status and manage active orders.
        </p>
      </div>
      <TableGrid />
    </div>
  );
}
