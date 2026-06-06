import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.user.role !== "ADMIN") return jsonUnauthorized();

  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        table: true,
      },
      orderBy: {
        createdAt: 'asc' // Oldest first
      }
    });

    const now = new Date().getTime();

    const formattedOrders = orders.map(order => {
      let orderIsDelayed = false;
      const orderCreatedAt = order.createdAt.getTime();
      const elapsedMs = now - orderCreatedAt;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      const items = order.items.map(item => {
        const prepTimeMs = item.menuItem.preparationTime * 60000;
        // Alert logic: If current time > createdAt + preparationTime, flag as DELAYED
        const isDelayed = now > (orderCreatedAt + prepTimeMs);
        
        if (isDelayed && (item.status === 'PENDING' || item.status === 'COOKING')) {
           orderIsDelayed = true;
        }

        return {
          ...item,
          preparationTime: item.menuItem.preparationTime,
          isDelayed
        };
      });

      return {
        ...order,
        items,
        timeElapsedMinutes: elapsedMinutes,
        isDelayed: orderIsDelayed
      };
    });

    const pending = formattedOrders.filter(o => ['PENDING', 'COOKING'].includes(o.status));
    const completed = formattedOrders.filter(o => ['READY', 'COMPLETED'].includes(o.status));

    return NextResponse.json({ pending, completed });

  } catch (error) {
    console.error("GET_KITCHEN_ORDERS_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
