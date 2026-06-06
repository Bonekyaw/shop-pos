import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";
import { Prisma } from "@/app/generated/prisma/client";

const TAX_RATE = new Prisma.Decimal(0.05); // Assume 5% tax for now

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                name: true
              }
            }
          }
        },
        table: true,
        waiter: {
          select: {
            name: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calculate totals
    const subtotal = order.items.reduce(
      (sum, item) => sum.add(item.price.mul(item.quantity)),
      new Prisma.Decimal(0)
    );
    
    // Total is calculated directly in order.totalAmount but we can recalculate just in case
    // Assuming totalAmount is subtotal in this system
    const taxAmount = subtotal.mul(TAX_RATE);
    const grandTotal = subtotal.add(taxAmount);

    const bill = {
      restaurantDetails: {
        name: "FutureLink POS Restaurant",
        address: "123 Default Street",
        contact: "+1 234 567 890"
      },
      orderDetails: {
        orderId: order.id,
        tableNumber: order.table?.number || "N/A",
        waiterName: order.waiter.name,
        type: order.type,
        status: order.status,
        date: order.createdAt
      },
      items: order.items.map(item => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price.mul(item.quantity))
      })),
      summary: {
        subtotal: Number(subtotal),
        taxRate: Number(TAX_RATE),
        taxAmount: Number(taxAmount),
        grandTotal: Number(grandTotal)
      }
    };

    return NextResponse.json({ bill }, { status: 200 });

  } catch (error) {
    console.error("GET_ORDER_BILL_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
