import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminRole } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { getEffectiveAdminRole } from "@/lib/auth/permissions";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { SocketProvider } from "@/components/providers/socket-provider";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/");
  }

  let userName = "";
  let adminRole: AdminRole | null = null;

  try {
    const decoded = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { name: true, role: true, adminRole: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== "ADMIN") {
      redirect("/");
    }

    userName = user.name;
    adminRole = getEffectiveAdminRole(user);
  } catch (error) {
    console.error("Dashboard auth error:", error);
    redirect("/");
  }

  return (
    <SocketProvider token={token}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar adminRole={adminRole} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar userName={userName} adminRole={adminRole} />
          <ScrollArea className="flex-1 bg-slate-50/50">
            <main className="p-6 mx-auto max-w-7xl">
              {children}
            </main>
          </ScrollArea>
        </div>
      </div>
    </SocketProvider>
  );
}
