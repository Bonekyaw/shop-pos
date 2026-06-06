import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { canManageWaiters } from "@/lib/auth/permissions";
import { WaiterManagement } from "@/components/dashboard/waiter-management";

export const metadata: Metadata = {
  title: "Waiter Management | FutureLink POS",
  description: "Manage waiter accounts, PINs, and mobile device sessions",
};

export default async function WaitersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/");
  }

  try {
    const decoded = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        role: true,
        adminRole: true,
        isActive: true,
      },
    });

    if (!user?.isActive || !canManageWaiters(user)) {
      redirect("/dashboard");
    }
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gradient">
          Waiter Management
        </h1>
        <p className="text-muted-foreground font-medium mt-1">
          Manage waiter accounts, PINs, and mobile device sessions.
        </p>
      </div>
      <WaiterManagement />
    </div>
  );
}
