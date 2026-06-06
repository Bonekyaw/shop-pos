import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized, jsonForbidden } from "@/lib/auth/http";
import { emitToRestaurant, emitToTable } from "@/lib/realtime/emit";
import { ServerEventType } from "@shared/socket-events";
import { snapshotOrder, writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();
  if (session.user.role !== "ADMIN") return jsonForbidden();

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payments: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { error: "No pending payment to cancel. Current status: " + order.paymentStatus },
        { status: 409 }
      );
    }

    const pendingPayment = order.payments[0];

    await prisma.$transaction(async (tx) => {
      // Capture before state
      const beforeSnapshot = await snapshotOrder(id, tx);

      // Delete the pending payment record
      if (pendingPayment) {
        await tx.payment.delete({ where: { id: pendingPayment.id } });
      }

      // Revert order paymentStatus back to PENDING (open for editing)
      await tx.order.update({
        where: { id },
        data: { paymentStatus: "PENDING" }
      });

      // Audit log with before/after state
      const afterSnapshot = await snapshotOrder(id, tx);
      await writeAuditLog(tx, session.user.id, "PAYMENT_CANCEL", id, beforeSnapshot, afterSnapshot, {
        paymentId: pendingPayment?.id ?? null,
        cancelledBy: session.user.id
      });
    });

    // Emit ORDER_UPDATED so waiter app knows payment was cancelled
    const payload = {
      type: ServerEventType.ORDER_UPDATED,
      restaurantId: "default",
      timestamp: new Date().toISOString(),
      orderId: id
    } as const;

    emitToRestaurant("default", payload);
    if (order.tableId) {
      emitToTable(order.tableId, payload);
    }

    return NextResponse.json({ success: true, message: "Payment cancelled, order returned to editing" });
  } catch (error) {
    console.error("PAYMENT_CANCEL_ERROR", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
