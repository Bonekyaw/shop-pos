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

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageAdmins(session.user)) {
    return jsonForbidden();
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: adminSelect,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ admins });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  if (!canManageAdmins(session.user)) {
    return jsonForbidden();
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      pin?: string;
      adminRole?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    let pin = body.pin?.trim();
    const adminRole = parseAdminRole(body.adminRole);

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "valid email is required" }, { status: 400 });
    }
    if (!adminRole) {
      return NextResponse.json({ error: "valid adminRole is required" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingEmail) {
      return NextResponse.json({ error: "This email is already in use" }, { status: 409 });
    }

    if (!pin) {
      let attempts = 0;
      let uniquePin = "";
      while (attempts < 100) {
        const candidate = Math.floor(1000 + Math.random() * 9000).toString();
        const existingPin = await findActiveUserByPin(candidate);
        if (!existingPin) {
          uniquePin = candidate;
          break;
        }
        attempts++;
      }
      if (!uniquePin) {
        return NextResponse.json({ error: "Failed to generate a unique PIN" }, { status: 500 });
      }
      pin = uniquePin;
    } else {
      if (!isValidPinFormat(pin)) {
        return NextResponse.json(
          { error: "pin must be exactly 4 digits" },
          { status: 400 },
        );
      }
      const existingPin = await findActiveUserByPin(pin);
      if (existingPin) {
        return NextResponse.json({ error: "This PIN is already in use" }, { status: 409 });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: {
          name,
          email,
          emailVerified: true,
          pin: await hashPin(pin),
          role: "ADMIN",
          adminRole,
        },
        select: adminSelect,
      });

      await writeAdminAuditLog(tx, session.user.id, "ADMIN_CREATE", {
        targetUserId: admin.id,
        after: auditUserSnapshot(admin),
      });

      return admin;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/admins:", error);
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 },
    );
  }
}
