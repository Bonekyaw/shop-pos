import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/request-session";
import { jsonUnauthorized, jsonForbidden } from "@/lib/auth/http";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();
  if (session.user.role !== "ADMIN") return jsonForbidden();

  try {
    const params = request.nextUrl.searchParams;

    // --- Filters ---
    const userId = params.get("userId");
    const actionType = params.get("actionType");
    const orderId = params.get("orderId");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");

    // --- Pagination (cursor-based) ---
    const cursor = params.get("cursor");
    const limitParam = params.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }
    if (actionType) {
      where.action = actionType;
    }
    if (orderId) {
      where.orderId = orderId;
    }
    if (startDate || endDate) {
      const timestampFilter: Record<string, Date> = {};
      if (startDate) {
        timestampFilter.gte = new Date(startDate);
      }
      if (endDate) {
        timestampFilter.lte = new Date(endDate);
      }
      where.timestamp = timestampFilter;
    }

    // Query with cursor-based pagination
    const findArgs: Parameters<typeof prisma.auditLog.findMany>[0] = {
      where,
      take: limit + 1, // fetch one extra to determine if there's a next page
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: { id: true, name: true, role: true, adminRole: true }
        },
        order: {
          select: { id: true, status: true, type: true, tableId: true }
        }
      }
    };

    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1; // skip the cursor record itself
    }

    const logs = await prisma.auditLog.findMany(findArgs);

    // Determine next cursor
    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const nextItem = logs.pop(); // remove the extra item
      nextCursor = nextItem!.id;
    }

    return NextResponse.json({
      logs,
      pagination: {
        nextCursor,
        hasMore: nextCursor !== null,
        limit
      }
    });
  } catch (error) {
    console.error("GET_AUDIT_LOGS_ERROR", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
