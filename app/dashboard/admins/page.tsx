import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { canManageAdmins } from "@/lib/auth/permissions";
import { AdminManagement } from "@/components/dashboard/admin-management";

export const metadata: Metadata = {
  title: "Admin Management | FutureLink POS",
  description: "Manage FutureLink POS admin accounts",
};

export default async function AdminsPage() {
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

    if (!user?.isActive || !canManageAdmins(user)) {
      redirect("/dashboard");
    }
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gradient">Admin Management</h1>
        <p className="text-muted-foreground font-medium mt-1">
          Manage admin access and review recent system activity.
        </p>
      </div>
      <AdminManagement />
    </div>
  );
}
