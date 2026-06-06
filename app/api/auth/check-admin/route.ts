import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ isAdmin: false });
    }

    const normalized = email.trim().toLowerCase();
    const admin = await prisma.user.findFirst({
      where: {
        email: normalized,
        role: "ADMIN",
        isActive: true,
      },
      select: { id: true },
    });

    return NextResponse.json({ isAdmin: !!admin });
  } catch (error) {
    console.error("check-admin error:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
