import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized, jsonForbidden } from "@/lib/auth/http";
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();
  if (session.user.role !== "ADMIN") return jsonForbidden();

  try {
    const params = request.nextUrl.searchParams;
    const dateParam = params.get("date"); // YYYY-MM-DD, defaults to today

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dateRange = { gte: dayStart, lte: dayEnd };

    // ── 1. Sales summary by payment method ──────────────────────────
    const confirmedPayments = await prisma.payment.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: dateRange
      }
    });

    const salesByMethod: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      CARD: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 }
    };

    let totalRevenue = new Prisma.Decimal(0);

    for (const p of confirmedPayments) {
      const method = p.method;
      salesByMethod[method].count += 1;
      salesByMethod[method].total += Number(p.amount);
      totalRevenue = totalRevenue.add(p.amount);
    }

    // ── 2. Waiter performance ───────────────────────────────────────
    const ordersToday = await prisma.order.findMany({
      where: { createdAt: dateRange },
      select: { id: true, waiterId: true }
    });

    const deliveredItemsToday = await prisma.orderItem.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: dateRange
      },
      select: { deliveredById: true }
    });

    // Aggregate per waiter
    const waiterMap = new Map<string, { ordersTaken: number; itemsDelivered: number }>();

    for (const o of ordersToday) {
      const entry = waiterMap.get(o.waiterId) || { ordersTaken: 0, itemsDelivered: 0 };
      entry.ordersTaken += 1;
      waiterMap.set(o.waiterId, entry);
    }

    for (const item of deliveredItemsToday) {
      if (item.deliveredById) {
        const entry = waiterMap.get(item.deliveredById) || { ordersTaken: 0, itemsDelivered: 0 };
        entry.itemsDelivered += 1;
        waiterMap.set(item.deliveredById, entry);
      }
    }

    // Fetch user names for the waiter IDs we collected
    const waiterIds = [...waiterMap.keys()];
    const waiters = waiterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: waiterIds } },
          select: { id: true, name: true }
        })
      : [];

    const waiterNameMap = new Map(waiters.map(w => [w.id, w.name]));

    const waiterPerformance = waiterIds.map(id => ({
      userId: id,
      name: waiterNameMap.get(id) ?? "Unknown",
      ...waiterMap.get(id)!
    }));

    // ── 3. Kitchen performance ──────────────────────────────────────
    // Average prep time: time from order creation to first COOKING status change
    // We approximate using completed items (DELIVERED/READY items with deliveredAt)
    const completedItems = await prisma.orderItem.findMany({
      where: {
        createdAt: dateRange,
        status: { in: ["READY", "DELIVERED"] }
      },
      include: {
        menuItem: { select: { preparationTime: true } },
        order: { select: { createdAt: true } }
      }
    });

    let totalPrepMinutes = 0;
    let prepItemCount = 0;
    let delayedOrderCount = 0;
    const delayedOrderIds = new Set<string>();

    const now = Date.now();

    for (const item of completedItems) {
      const orderCreatedMs = item.order.createdAt.getTime();
      const completedMs = item.deliveredAt
        ? item.deliveredAt.getTime()
        : now;

      const actualPrepMinutes = (completedMs - orderCreatedMs) / 60000;
      totalPrepMinutes += actualPrepMinutes;
      prepItemCount += 1;

      // Flag as delayed if actual prep exceeded expected
      if (actualPrepMinutes > item.menuItem.preparationTime) {
        delayedOrderIds.add(item.orderId);
      }
    }

    // Also check currently active items that are still PENDING/COOKING and overdue
    const activeItems = await prisma.orderItem.findMany({
      where: {
        createdAt: dateRange,
        status: { in: ["PENDING", "COOKING"] }
      },
      include: {
        menuItem: { select: { preparationTime: true } },
        order: { select: { createdAt: true } }
      }
    });

    for (const item of activeItems) {
      const elapsed = (now - item.order.createdAt.getTime()) / 60000;
      if (elapsed > item.menuItem.preparationTime) {
        delayedOrderIds.add(item.orderId);
      }
    }

    delayedOrderCount = delayedOrderIds.size;
    const avgPrepTimeMinutes = prepItemCount > 0
      ? Math.round((totalPrepMinutes / prepItemCount) * 10) / 10
      : 0;

    // ── 4. Table turnover rate ──────────────────────────────────────
    // Turnover = number of completed dine-in orders per table today
    const completedDineIn = await prisma.order.findMany({
      where: {
        createdAt: dateRange,
        status: "COMPLETED",
        type: "DINE_IN",
        tableId: { not: null }
      },
      select: { tableId: true }
    });

    const tables = await prisma.diningTable.findMany({
      select: { id: true, number: true }
    });

    const turnoverMap = new Map<string, number>();
    for (const o of completedDineIn) {
      if (o.tableId) {
        turnoverMap.set(o.tableId, (turnoverMap.get(o.tableId) || 0) + 1);
      }
    }

    const tableTurnover = tables.map(t => ({
      tableId: t.id,
      tableNumber: t.number,
      ordersCompleted: turnoverMap.get(t.id) || 0
    }));

    const avgTurnover = tables.length > 0
      ? Math.round((completedDineIn.length / tables.length) * 10) / 10
      : 0;

    // ── Assemble response ───────────────────────────────────────────
    return NextResponse.json({
      date: dayStart.toISOString().split("T")[0],
      sales: {
        totalRevenue: Number(totalRevenue),
        totalTransactions: confirmedPayments.length,
        byMethod: salesByMethod
      },
      waiterPerformance,
      kitchen: {
        totalItemsCompleted: prepItemCount,
        avgPrepTimeMinutes,
        delayedOrderCount,
        currentlyActiveItems: activeItems.length
      },
      tableTurnover: {
        average: avgTurnover,
        tables: tableTurnover
      }
    });
  } catch (error) {
    console.error("GET_DAILY_REPORT_ERROR", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
