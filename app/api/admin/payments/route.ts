import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, jsonUnauthorized, jsonForbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();
  if (session.user.role !== "ADMIN") return jsonForbidden();

  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: "PENDING_CONFIRMATION"
      },
      include: {
        table: true,
        waiter: {
          select: { name: true }
        },
        payments: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET_PENDING_PAYMENTS_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
