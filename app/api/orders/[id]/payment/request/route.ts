import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";
import { emitToRestaurant, emitToKitchen } from "@/lib/realtime/emit";
import { ServerEventType } from "@shared/socket-events";
import { snapshotOrder, writeAuditLog } from "@/lib/audit";

const requestPaymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "UPI"]),
  amount: z.number().positive()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const body = await request.json();
    const result = requestPaymentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation Error", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { method, amount } = result.data;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payments: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Block if a payment is already pending confirmation or confirmed
    if (order.paymentStatus === "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { error: "Payment already pending confirmation" },
        { status: 409 }
      );
    }

    if (order.paymentStatus === "CONFIRMED") {
      return NextResponse.json(
        { error: "Order is already paid" },
        { status: 409 }
      );
    }

    const payment = await prisma.$transaction(async (tx) => {
      // Capture before state
      const beforeSnapshot = await snapshotOrder(id, tx);

      // Create Payment record
      const newPayment = await tx.payment.create({
        data: {
          orderId: id,
          amount,
          method,
          status: "PENDING",
          initiatedById: session.user.id
        }
      });

      // Set order paymentStatus to PENDING_CONFIRMATION
      await tx.order.update({
        where: { id },
        data: { paymentStatus: "PENDING_CONFIRMATION" }
      });

      // Audit log with before/after state
      const afterSnapshot = await snapshotOrder(id, tx);
      await writeAuditLog(tx, session.user.id, "PAYMENT_INIT", id, beforeSnapshot, afterSnapshot, {
        paymentId: newPayment.id,
        method,
        amount
      });

      return newPayment;
    });

    // Emit socket event: PAYMENT_REQUESTED to admin dashboard
    const payload = {
      type: ServerEventType.PAYMENT_REQUESTED,
      restaurantId: "default",
      timestamp: new Date().toISOString(),
      orderId: id,
      paymentId: payment.id
    } as const;

    emitToRestaurant("default", payload);
    emitToKitchen(payload);

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    console.error("PAYMENT_REQUEST_ERROR", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
