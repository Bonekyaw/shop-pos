import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/audit";
import {
  canManageWaiters,
  generateUniquePin,
  getSession,
  hashPin,
  jsonForbidden,
  jsonUnauthorized,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const waiterSelect = {
  id: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  mobileSession: {
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      createdAt: true,
      lastSeenAt: true,
    },
  },
} as const;

function auditUserSnapshot<T extends { createdAt: Date }>(user: T) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageWaiters(session.user)) {
    return jsonForbidden();
  }

  const { id } = await params;

  const user = await prisma.user.findFirst({
    where: { id, role: "WAITER" },
    select: waiterSelect,
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageWaiters(session.user)) {
    return jsonForbidden();
  }

  const { id } = await params;

  const target = await prisma.user.findFirst({
    where: { id, role: "WAITER" },
    select: waiterSelect,
  });

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      regeneratePin?: boolean;
      isActive?: boolean;
    };

    const data: {
      name?: string;
      pin?: string;
      isActive?: boolean;
    } = {};

    let newPlaintextPin: string | undefined;

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.regeneratePin === true) {
      const pin = await generateUniquePin();
      data.pin = await hashPin(pin);
      newPlaintextPin = pin;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const waiter = await tx.user.update({
        where: { id },
        data,
        select: waiterSelect,
      });

      // If PIN was regenerated, revoke any active mobile session
      if (newPlaintextPin) {
        await tx.mobileSession.deleteMany({ where: { userId: id } });
      }

      // If deactivated, also revoke mobile session
      if (data.isActive === false) {
        await tx.mobileSession.deleteMany({ where: { userId: id } });
      }

      await writeAdminAuditLog(tx, session.user.id, "WAITER_UPDATE", {
        targetUserId: waiter.id,
        before: auditUserSnapshot(target),
        after: auditUserSnapshot(waiter),
        changedFields: Object.keys(data),
      });

      return waiter;
    });

    // Re-fetch to get updated session info (after deletion)
    const refreshed = await prisma.user.findFirst({
      where: { id, role: "WAITER" },
      select: waiterSelect,
    });

    return NextResponse.json({
      ...(refreshed ?? updated),
      ...(newPlaintextPin ? { pin: newPlaintextPin } : {}),
    });
  } catch (error) {
    console.error("PATCH /api/admin/waiters/[id]:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageWaiters(session.user)) {
    return jsonForbidden();
  }

  const { id } = await params;

  if (session.user.id === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findFirst({
    where: { id, role: "WAITER" },
    select: waiterSelect,
  });

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Revoke mobile session
      await tx.mobileSession.deleteMany({ where: { userId: id } });

      const updated = await tx.user.update({
        where: { id },
        data: { isActive: false },
        select: waiterSelect,
      });

      await writeAdminAuditLog(tx, session.user.id, "WAITER_DEACTIVATE", {
        targetUserId: updated.id,
        before: auditUserSnapshot(target),
        after: auditUserSnapshot(updated),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/waiters/[id]:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
