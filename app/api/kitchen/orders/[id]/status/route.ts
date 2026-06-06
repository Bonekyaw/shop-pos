import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";
import { emitToKitchen, emitToRestaurant, emitToTable } from "@/lib/realtime/emit";
import { ServerEventType } from "@shared/socket-events";
import { snapshotOrder, writeAuditLog } from "@/lib/audit";

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "COOKING", "READY", "DELIVERED", "COMPLETED"]),
  itemId: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.user.role !== "ADMIN") return jsonUnauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Validation Error", details: result.error.flatten() }, { status: 400 });
    }

    const { status, itemId } = result.data;
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (itemId) {
      await prisma.$transaction(async (tx) => {
        const beforeSnapshot = await snapshotOrder(id, tx);

        await tx.orderItem.update({
          where: { id: itemId, orderId: id },
          // Valid status for orderItem are PENDING, COOKING, READY, DELIVERED
          data: { status: status as any }
        });

        const afterSnapshot = await snapshotOrder(id, tx);
        await writeAuditLog(tx, session.user.id, "MODIFY_ORDER", id, beforeSnapshot, afterSnapshot, {
          message: "Item status updated",
          itemId,
          newStatus: status
        });
      });
      
      const payload = {
        type: ServerEventType.ORDER_UPDATED,
        restaurantId: "default",
        timestamp: new Date().toISOString(),
        orderId: id
      } as const;
      emitToKitchen(payload);
      emitToRestaurant("default", payload);

      return NextResponse.json({ success: true });
    } else {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const beforeSnapshot = await snapshotOrder(id, tx);

        const updated = await tx.order.update({
          where: { id },
          // Valid status for order are PENDING, COOKING, READY, COMPLETED
          data: { status: status as any }
        });

        const afterSnapshot = await snapshotOrder(id, tx);
        await writeAuditLog(tx, session.user.id, "MODIFY_ORDER", id, beforeSnapshot, afterSnapshot, {
          message: "Order status updated",
          newStatus: status
        });

        return updated;
      });

      if (status === "READY") {
        const payload = {
          type: ServerEventType.ORDER_READY,
          restaurantId: "default",
          timestamp: new Date().toISOString(),
          orderId: id
        } as const;
        emitToKitchen(payload);
        emitToRestaurant("default", payload);
        if (order.tableId) {
          emitToTable(order.tableId, payload);
        }
      } else {
        const payload = {
          type: ServerEventType.ORDER_UPDATED,
          restaurantId: "default",
          timestamp: new Date().toISOString(),
          orderId: id
        } as const;
        emitToKitchen(payload);
        emitToRestaurant("default", payload);
      }

      return NextResponse.json({ success: true, order: updatedOrder });
    }

  } catch (error) {
    console.error("UPDATE_ORDER_STATUS_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
