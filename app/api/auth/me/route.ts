import { NextRequest, NextResponse } from "next/server";
import { getSession, jsonUnauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return jsonUnauthorized();
  }
  return NextResponse.json({ user: session.user });
}
