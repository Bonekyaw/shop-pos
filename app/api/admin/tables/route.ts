import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, jsonUnauthorized, jsonForbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return jsonUnauthorized();
  if (session.user.role !== "ADMIN") return jsonForbidden();

  try {
    const tables = await prisma.diningTable.findMany({
      include: {
        currentOrder: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
          }
        }
      },
      orderBy: { number: "asc" }
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("GET_TABLES_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
