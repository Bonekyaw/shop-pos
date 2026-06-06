import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";
import { emitToRestaurant } from "@/lib/realtime/emit";
import { ServerEventType } from "@shared/socket-events";
import { Prisma } from "@/app/generated/prisma/client";
import { snapshotOrder, writeAuditLog } from "@/lib/audit";

const addItemsSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().positive(),
    notes: z.string().optional()
  })).min(1, "Must provide at least one item to add")
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const body = await request.json();
    const result = addItemsSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Validation Error", details: result.error.flatten() }, { status: 400 });
    }
    
    const data = result.data;

    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PENDING" && order.status !== "COOKING") {
      return NextResponse.json({ error: "Can only add items to PENDING or COOKING orders" }, { status: 400 });
    }

    if (order.paymentStatus === "PENDING_CONFIRMATION" || order.paymentStatus === "CONFIRMED") {
      return NextResponse.json({ error: "Cannot modify order while payment is pending or confirmed" }, { status: 409 });
    }

    // Fetch menu items to get prices
    const menuItemIds = [...new Set(data.items.map(i => i.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json({ error: "One or more menu items not found" }, { status: 400 });
    }

    const itemPriceMap = new Map<string, Prisma.Decimal>(menuItems.map(m => [m.id, m.price]));

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Capture before state
      const beforeSnapshot = await snapshotOrder(id, tx);

      let addedAmount = new Prisma.Decimal(0);
      
      for (const itemToAdd of data.items) {
        const price = itemPriceMap.get(itemToAdd.menuItemId)!;
        const itemTotal = price.mul(itemToAdd.quantity);
        addedAmount = addedAmount.add(itemTotal);

        // Find existing item with same menuItemId and notes
        const existingItem = order.items.find(i => 
          i.menuItemId === itemToAdd.menuItemId && 
          (i.notes || "") === (itemToAdd.notes || "") &&
          (i.status === "PENDING" || i.status === "COOKING")
        );

        if (existingItem) {
          await tx.orderItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + itemToAdd.quantity
            }
          });
        } else {
          await tx.orderItem.create({
            data: {
              orderId: id,
              menuItemId: itemToAdd.menuItemId,
              quantity: itemToAdd.quantity,
              price: price,
              notes: itemToAdd.notes,
              status: "PENDING"
            }
          });
        }
      }

      // Recalculate total
      const newTotalAmount = order.totalAmount.add(addedAmount);

      const finalOrder = await tx.order.update({
        where: { id },
        data: {
          totalAmount: newTotalAmount
        },
        include: {
          items: true,
          table: true
        }
      });

      // Audit log with before/after state
      const afterSnapshot = await snapshotOrder(id, tx);
      await writeAuditLog(tx, session.user.id, "MODIFY_ORDER", id, beforeSnapshot, afterSnapshot, {
        message: "Items added to order",
        addedItems: data.items
      });

      return finalOrder;
    });

    // Emit socket events
    const payload = {
      type: ServerEventType.ORDER_UPDATED,
      restaurantId: "default",
      timestamp: new Date().toISOString(),
      orderId: updatedOrder.id
    } as const;

    emitToRestaurant("default", payload);

    return NextResponse.json({ order: updatedOrder }, { status: 200 });

  } catch (error) {
    console.error("MODIFY_ORDER_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
