import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, jsonUnauthorized } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();

  try {
    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: true,
            deliveredBy: { select: { name: true } }
          }
        },
        table: true,
        waiter: { select: { name: true } },
        auditLogs: {
          include: { user: { select: { name: true } } },
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("GET_ORDER_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
