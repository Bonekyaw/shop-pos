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

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageWaiters(session.user)) {
    return jsonForbidden();
  }

  const waiters = await prisma.user.findMany({
    where: { role: "WAITER" },
    select: waiterSelect,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(waiters);
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageWaiters(session.user)) {
    return jsonForbidden();
  }

  try {
    const body = (await request.json()) as {
      name?: string;
    };

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Auto-generate a unique 4-digit PIN
    const pin = await generateUniquePin();
    const hashedPin = await hashPin(pin);

    const created = await prisma.$transaction(async (tx) => {
      const waiter = await tx.user.create({
        data: {
          name,
          pin: hashedPin,
          role: "WAITER",
        },
        select: waiterSelect,
      });

      await writeAdminAuditLog(tx, session.user.id, "WAITER_CREATE", {
        targetUserId: waiter.id,
        after: auditUserSnapshot(waiter),
      });

      return waiter;
    });

    // Return the plaintext PIN so the admin can share it with the waiter
    return NextResponse.json({ ...created, pin }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/waiters:", error);
    return NextResponse.json(
      { error: "Failed to create waiter" },
      { status: 500 },
    );
  }
}
