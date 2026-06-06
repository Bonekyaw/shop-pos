import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";
import { emitToKitchen, emitToRestaurant } from "@/lib/realtime/emit";
import { ServerEventType } from "@shared/socket-events";
import { Prisma } from "@/app/generated/prisma/client";
import { snapshotOrder, writeAuditLog } from "@/lib/audit";

const createOrderSchema = z.object({
  tableId: z.string().optional().nullable(),
  type: z.enum(["DINE_IN", "PARCEL"]),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().positive(),
    notes: z.string().optional()
  })).min(1, "Order must have at least one item")
}).refine(data => {
  if (data.type === "DINE_IN" && !data.tableId) {
    return false;
  }
  return true;
}, {
  message: "Table ID is required for DINE_IN orders",
  path: ["tableId"]
});

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();

  try {
    const body = await request.json();
    const result = createOrderSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Validation Error", details: result.error.flatten() }, { status: 400 });
    }
    
    const data = result.data;

    // Check if table has active order
    if (data.tableId) {
      const table = await prisma.diningTable.findUnique({
        where: { id: data.tableId }
      });
      if (!table) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }
      if (table.currentOrderId) {
        return NextResponse.json({ error: "Table already has an active order" }, { status: 400 });
      }
    }

    // Fetch menu items to get prices and validate existence
    const menuItemIds = [...new Set(data.items.map(i => i.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json({ error: "One or more menu items not found" }, { status: 400 });
    }

    const itemPriceMap = new Map<string, Prisma.Decimal>(menuItems.map(m => [m.id, m.price]));

    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData = data.items.map(item => {
      const price = itemPriceMap.get(item.menuItemId)!;
      const itemTotal = price.mul(item.quantity);
      totalAmount = totalAmount.add(itemTotal);
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price,
        notes: item.notes,
        status: "PENDING" as const
      };
    });

    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          tableId: data.tableId || null,
          waiterId: session.user.id,
          type: data.type,
          status: "PENDING",
          totalAmount,
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true,
          table: true
        }
      });

      // Update table if dine-in
      if (data.tableId) {
        await tx.diningTable.update({
          where: { id: data.tableId },
          data: {
            currentOrderId: newOrder.id,
            status: "OCCUPIED"
          }
        });
      }

      // Audit log with full after-state snapshot
      const afterSnapshot = await snapshotOrder(newOrder.id, tx);
      await writeAuditLog(tx, session.user.id, "CREATE_ORDER", newOrder.id, null, afterSnapshot, {
        message: "Order created",
        itemCount: data.items.length
      });

      return newOrder;
    });

    // Emit socket events
    const payload = {
      type: ServerEventType.ORDER_CREATED,
      restaurantId: "default",
      timestamp: new Date().toISOString(),
      orderId: order.id,
      tableId: order.tableId
    } as const;

    emitToKitchen(payload);
    emitToRestaurant("default", payload);

    return NextResponse.json({ order }, { status: 201 });

  } catch (error) {
    console.error("CREATE_ORDER_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
