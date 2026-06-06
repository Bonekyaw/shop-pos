import { NextRequest, NextResponse } from "next/server";
import type { AdminRole } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/audit";
import {
  canManageAdmins,
  findActiveUserByPin,
  getSession,
  hashPin,
  isValidPinFormat,
  jsonForbidden,
  jsonUnauthorized,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_ROLES = ["SUPER_ADMIN", "MANAGER", "COUNTER"] as const;

const adminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  adminRole: true,
  isActive: true,
  createdAt: true,
} as const;

function auditUserSnapshot<T extends { createdAt: Date }>(user: T) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

function parseAdminRole(value: unknown): AdminRole | null {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole)
    ? (value as AdminRole)
    : null;
}

async function wouldRemoveLastSuperAdmin(id: string): Promise<boolean> {
  const activeSuperAdmins = await prisma.user.count({
    where: {
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      isActive: true,
      NOT: { id },
    },
  });

  return activeSuperAdmins === 0;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageAdmins(session.user)) {
    return jsonForbidden();
  }

  const { id } = await params;
  const admin = await prisma.user.findFirst({
    where: { id, role: "ADMIN" },
    select: adminSelect,
  });

  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(admin);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageAdmins(session.user)) {
    return jsonForbidden();
  }

  const { id } = await params;
  const target = await prisma.user.findFirst({
    where: { id, role: "ADMIN" },
    select: adminSelect,
  });

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      pin?: string;
      adminRole?: string;
      isActive?: boolean;
    };

    const data: {
      name?: string;
      email?: string;
      pin?: string;
      adminRole?: AdminRole;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) {
        return NextResponse.json({ error: "valid email is required" }, { status: 400 });
      }
      const clash = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: "This email is already in use" },
          { status: 409 },
        );
      }
      data.email = email;
    }

    if (body.pin !== undefined) {
      const pin = body.pin.trim();
      if (!isValidPinFormat(pin)) {
        return NextResponse.json(
          { error: "pin must be exactly 4 digits" },
          { status: 400 },
        );
      }
      const clash = await findActiveUserByPin(pin);
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: "This PIN is already in use" },
          { status: 409 },
        );
      }
      data.pin = await hashPin(pin);
    }

    if (body.adminRole !== undefined) {
      const adminRole = parseAdminRole(body.adminRole);
      if (!adminRole) {
        return NextResponse.json({ error: "valid adminRole is required" }, { status: 400 });
      }
      if (session.user.id === id && adminRole !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Cannot change your own Super Admin role" },
          { status: 400 },
        );
      }
      if (target.adminRole === "SUPER_ADMIN" && adminRole !== "SUPER_ADMIN") {
        if (await wouldRemoveLastSuperAdmin(id)) {
          return NextResponse.json(
            { error: "At least one active Super Admin is required" },
            { status: 400 },
          );
        }
      }
      data.adminRole = adminRole;
    }

    if (body.isActive !== undefined) {
      const isActive = Boolean(body.isActive);
      if (session.user.id === id && !isActive) {
        return NextResponse.json(
          { error: "Cannot deactivate your own account" },
          { status: 400 },
        );
      }
      if (target.adminRole === "SUPER_ADMIN" && !isActive) {
        if (await wouldRemoveLastSuperAdmin(id)) {
          return NextResponse.json(
            { error: "At least one active Super Admin is required" },
            { status: 400 },
          );
        }
      }
      data.isActive = isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.update({
        where: { id },
        data,
        select: adminSelect,
      });

      await writeAdminAuditLog(tx, session.user.id, "ADMIN_UPDATE", {
        targetUserId: admin.id,
        before: auditUserSnapshot(target),
        after: auditUserSnapshot(admin),
        changedFields: Object.keys(data),
      });

      return admin;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/admins/[id]:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageAdmins(session.user)) {
    return jsonForbidden();
  }

  const { id } = await params;

  if (session.user.id === id) {
    return NextResponse.json(
      { error: "Cannot deactivate your own account" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findFirst({
    where: { id, role: "ADMIN" },
    select: adminSelect,
  });

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.adminRole === "SUPER_ADMIN" && await wouldRemoveLastSuperAdmin(id)) {
    return NextResponse.json(
      { error: "At least one active Super Admin is required" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { isActive: false },
        select: adminSelect,
      });

      await writeAdminAuditLog(tx, session.user.id, "ADMIN_DEACTIVATE", {
        targetUserId: updated.id,
        before: auditUserSnapshot(target),
        after: auditUserSnapshot(updated),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/admins/[id]:", error);
    return NextResponse.json({ error: "Deactivate failed" }, { status: 500 });
  }
}
