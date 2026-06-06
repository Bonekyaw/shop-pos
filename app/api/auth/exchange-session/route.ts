import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/better-auth";
import { signAccessToken, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * After Better Auth email OTP, mint the existing POS JWT cookie so Socket.io and REST guards keep working.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });

  if (!user?.isActive || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await signAccessToken({
    sub: user.id,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, token);
  return res;
}
