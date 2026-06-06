import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/audit";
import {
  canManageWaiters,
  getSession,
  jsonForbidden,
  jsonUnauthorized,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/admin/waiters/[id]/session
 * Revoke the waiter's active mobile session — the mobile app will auto-logout.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageWaiters(session.user)) {
    return jsonForbidden();
  }

  const { id } = await params;

  const waiter = await prisma.user.findFirst({
    where: { id, role: "WAITER" },
    select: { id: true, name: true, mobileSession: { select: { id: true, deviceName: true } } },
  });

  if (!waiter) {
    return NextResponse.json({ error: "Waiter not found" }, { status: 404 });
  }

  if (!waiter.mobileSession) {
    return NextResponse.json({ error: "No active mobile session" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.mobileSession.delete({ where: { id: waiter.mobileSession!.id } });

      await writeAdminAuditLog(tx, session.user.id, "WAITER_SESSION_REVOKE", {
        targetUserId: waiter.id,
        waiterName: waiter.name,
        deviceName: waiter.mobileSession!.deviceName,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/waiters/[id]/session:", error);
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
  }
}
