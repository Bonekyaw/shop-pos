import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";
import { emitToTable, emitToRestaurant, emitToKitchen } from "@/lib/realtime/emit";
import { ServerEventType } from "@shared/socket-events";
import { snapshotOrder, writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();

  try {
    const { id: orderId, itemId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const item = order.items.find(i => i.id === itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Capture before state
      const beforeSnapshot = await snapshotOrder(orderId, tx);

      // Mark specific item as DELIVERED
      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          deliveredById: session.user.id
        }
      });

      // If all items delivered, auto-update order status to COMPLETED
      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const allDelivered = allItems.every(i => i.status === "DELIVERED");

      let finalOrder = order;
      if (allDelivered && order.status !== "COMPLETED") {
        finalOrder = await tx.order.update({
          where: { id: orderId },
          data: { 
            status: "COMPLETED", 
            completedAt: new Date() 
          },
          include: { items: true }
        });
      }

      // Audit log with before/after state
      const afterSnapshot = await snapshotOrder(orderId, tx);
      await writeAuditLog(tx, session.user.id, "DELIVER_ITEM", orderId, beforeSnapshot, afterSnapshot, {
        itemId,
        allDelivered
      });

      return finalOrder;
    });

    // Emit socket event: ITEM_DELIVERED to specific table room
    const payload = {
      type: ServerEventType.ITEM_DELIVERED,
      restaurantId: "default",
      timestamp: new Date().toISOString(),
      orderId,
      orderItemId: itemId
    } as const;

    if (order.tableId) {
      emitToTable(order.tableId, payload);
    }
    emitToRestaurant("default", payload);
    emitToKitchen(payload);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("DELIVER_ITEM_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
