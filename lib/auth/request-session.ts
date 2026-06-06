import type { NextRequest } from "next/server";
import prisma from "../prisma";
import { SESSION_COOKIE_NAME } from "./cookie";
import { verifyAccessToken } from "./jwt";
import type { AuthTokenPayload, PublicUser } from "./types";

export type SessionContext = {
  token: AuthTokenPayload;
  user: PublicUser;
};

function extractBearer(request: NextRequest): string | undefined {
  const h = request.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) {
    return undefined;
  }
  const t = h.slice("Bearer ".length).trim();
  return t.length > 0 ? t : undefined;
}

function extractCookie(request: NextRequest): string | undefined {
  const v = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return v && v.length > 0 ? v : undefined;
}

/**
 * Resolve Bearer token (mobile) or HTTP-only session cookie (web admin).
 */
export function getTokenFromRequest(request: NextRequest): string | undefined {
  return extractBearer(request) ?? extractCookie(request);
}

export async function getSession(
  request: NextRequest,
): Promise<SessionContext | null> {
  const raw = getTokenFromRequest(request);
  if (!raw) {
    return null;
  }
  try {
    const token = await verifyAccessToken(raw);
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: {
        id: true,
        name: true,
        role: true,
        adminRole: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user || !user.isActive) {
      return null;
    }
    if (user.role !== token.role) {
      return null;
    }
    return { token, user };
  } catch {
    return null;
  }
}
