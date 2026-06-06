import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { getTokenFromRequest, verifyAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * GET /api/auth/session-check
 * Mobile app calls this on resume to verify its session hasn't been revoked.
 * Returns { valid: true } or { valid: false }.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = getTokenFromRequest(request);
    if (!raw) {
      return NextResponse.json({ valid: false });
    }

    const payload = await verifyAccessToken(raw);

    // Check user is still active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, role: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ valid: false });
    }

    // For waiters, check that the mobile session still exists with matching token
    if (user.role === "WAITER") {
      const session = await prisma.mobileSession.findUnique({
        where: { userId: payload.sub },
        select: { tokenHash: true },
      });

      if (!session || session.tokenHash !== hashToken(raw)) {
        return NextResponse.json({ valid: false });
      }

      // Update lastSeenAt
      await prisma.mobileSession.update({
        where: { userId: payload.sub },
        data: { lastSeenAt: new Date() },
      });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
