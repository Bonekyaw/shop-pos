import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized } from "@/lib/auth/http";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();

  try {
    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get("tableId");
    const waiterId = searchParams.get("waiterId");
    const statusParam = searchParams.get("status");

    const whereClause: any = {
      status: {
        not: "COMPLETED"
      }
    };

    if (tableId) {
      whereClause.tableId = tableId;
    }
    if (waiterId) {
      whereClause.waiterId = waiterId;
    }
    if (statusParam) {
      // Override the status condition if explicitly requested
      whereClause.status = statusParam;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                preparationTime: true
              }
            }
          }
        },
        table: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const now = Date.now();

    // Map to include preparation time alerts
    const mappedOrders = orders.map(order => {
      const itemsWithAlerts = order.items.map(item => {
        let isDelayed = false;
        
        if (item.status === "PENDING" || item.status === "COOKING") {
          const prepTimeMs = item.menuItem.preparationTime * 60 * 1000;
          const timeElapsed = now - new Date(item.createdAt).getTime();
          if (timeElapsed > prepTimeMs) {
            isDelayed = true;
          }
        }

        return {
          ...item,
          isDelayed
        };
      });

      return {
        ...order,
        items: itemsWithAlerts
      };
    });

    return NextResponse.json({ orders: mappedOrders }, { status: 200 });

  } catch (error) {
    console.error("GET_ACTIVE_ORDERS_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
