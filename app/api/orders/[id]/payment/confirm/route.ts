import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized, jsonForbidden } from "@/lib/auth/http";
import { emitToRestaurant, emitToTable } from "@/lib/realtime/emit";
import { ServerEventType } from "@shared/socket-events";
import { Prisma } from "@/app/generated/prisma/client";
import { snapshotOrder, writeAuditLog } from "@/lib/audit";

const TAX_RATE = new Prisma.Decimal(0.05);

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
        },
        items: {
          include: {
            menuItem: { select: { name: true } }
          }
        },
        table: true,
        waiter: { select: { name: true } }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { error: "No pending payment to confirm. Current status: " + order.paymentStatus },
        { status: 409 }
      );
    }

    const pendingPayment = order.payments[0];
    if (!pendingPayment) {
      return NextResponse.json(
        { error: "No pending Payment record found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Capture before state
      const beforeSnapshot = await snapshotOrder(id, tx);

      // Confirm the payment
      await tx.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: "CONFIRMED",
          confirmedById: session.user.id
        }
      });

      // Update order
      await tx.order.update({
        where: { id },
        data: {
          paymentStatus: "CONFIRMED",
          status: "COMPLETED",
          completedAt: new Date()
        }
      });

      // Clear table if dine-in
      if (order.tableId) {
        await tx.diningTable.update({
          where: { id: order.tableId },
          data: {
            status: "AVAILABLE",
            currentOrderId: null
          }
        });
      }

      // Audit log with before/after state
      const afterSnapshot = await snapshotOrder(id, tx);
      await writeAuditLog(tx, session.user.id, "PAYMENT_CONFIRM", id, beforeSnapshot, afterSnapshot, {
        paymentId: pendingPayment.id,
        confirmedBy: session.user.id,
        method: pendingPayment.method,
        amount: Number(pendingPayment.amount)
      });
    });

    // Emit PAYMENT_CONFIRMED to waiter app (table room + restaurant)
    const payload = {
      type: ServerEventType.PAYMENT_CONFIRMED,
      restaurantId: "default",
      timestamp: new Date().toISOString(),
      orderId: id,
      paymentId: pendingPayment.id
    } as const;

    emitToRestaurant("default", payload);
    if (order.tableId) {
      emitToTable(order.tableId, payload);
    }

    // Build receipt data
    const subtotal = order.items.reduce(
      (sum, item) => sum.add(item.price.mul(item.quantity)),
      new Prisma.Decimal(0)
    );
    const taxAmount = subtotal.mul(TAX_RATE);
    const grandTotal = subtotal.add(taxAmount);

    const receipt = {
      restaurantDetails: {
        name: "FutureLink POS Restaurant",
        address: "123 Default Street",
        contact: "+1 234 567 890"
      },
      orderDetails: {
        orderId: order.id,
        tableNumber: order.table?.number ?? "N/A",
        waiterName: order.waiter.name,
        type: order.type,
        date: order.createdAt
      },
      items: order.items.map(item => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price.mul(item.quantity))
      })),
      payment: {
        method: pendingPayment.method,
        paymentId: pendingPayment.id,
        confirmedBy: session.user.name
      },
      summary: {
        subtotal: Number(subtotal),
        taxRate: Number(TAX_RATE),
        taxAmount: Number(taxAmount),
        grandTotal: Number(grandTotal)
      }
    };

    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    console.error("PAYMENT_CONFIRM_ERROR", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
