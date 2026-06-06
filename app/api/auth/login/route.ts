import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import {
  findActiveUserByPin,
  setSessionCookie,
  signAccessToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type ClientType = "web" | "mobile";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      pin?: string;
      clientType?: ClientType;
      deviceId?: string;
      deviceName?: string;
    };

    const pin = body.pin?.trim() ?? "";
    const clientType: ClientType =
      body.clientType === "mobile" ? "mobile" : "web";

    const user = await findActiveUserByPin(pin);
    if (!user) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    // For mobile logins, restrict to WAITER role only
    if (clientType === "mobile" && user.role !== "WAITER") {
      return NextResponse.json(
        { error: "Admin accounts cannot log in from mobile" },
        { status: 403 },
      );
    }

    const token = await signAccessToken({
      sub: user.id,
      role: user.role,
    });

    // For mobile clients, create/replace mobile session for device tracking
    if (clientType === "mobile") {
      const deviceId = body.deviceId?.trim() || "unknown";
      const deviceName = body.deviceName?.trim() || "Unknown Device";

      // Upsert: replace any existing session for this user (one device per PIN)
      await prisma.mobileSession.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          deviceId,
          deviceName,
          tokenHash: hashToken(token),
        },
        update: {
          deviceId,
          deviceName,
          tokenHash: hashToken(token),
          lastSeenAt: new Date(),
        },
      });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      ...(clientType === "mobile" ? { token, expiresIn: 8 * 60 * 60 } : {}),
    });

    if (clientType === "web") {
      setSessionCookie(response, token);
    }

    return response;
  } catch (error) {
    console.error("login:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
