import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";
import { getJwtSecretKeyBytes } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";

const ALG = "HS256";

function getToken(request: NextRequest): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const t = auth.slice("Bearer ".length).trim();
    if (t.length > 0) {
      return t;
    }
  }
  const c = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return c && c.length > 0 ? c : undefined;
}

/**
 * Edge guard for /api/admin/* — validates JWT signature + expiry.
 * Route handlers still load the user from the DB (active flag, role).
 */
export async function proxy(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await jose.jwtVerify(token, getJwtSecretKeyBytes(), { algorithms: [ALG] });
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
