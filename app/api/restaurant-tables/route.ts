import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { orders, restaurantTables } from "@/db/schema";

function parseNumeric(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select({
        id: restaurantTables.id,
        number: restaurantTables.number,
        capacity: restaurantTables.capacity,
        status: restaurantTables.status,
        area: restaurantTables.area,
        orderTotalAmount: orders.totalAmount,
        orderPaidAmount: orders.paidAmount,
      })
      .from(restaurantTables)
      .leftJoin(
        orders,
        and(eq(orders.tableId, restaurantTables.id), eq(orders.status, "open")),
      );

    const mapped = rows.map((row) => {
      const totalAmount = parseNumeric(row.orderTotalAmount);
      const paidAmount = parseNumeric(row.orderPaidAmount);

      const outstanding = Math.max(0, totalAmount - paidAmount);

      return {
        id: row.id,
        number: row.number,
        capacity: row.capacity,
        status: row.status,
        area: row.area,
        amount: outstanding || null,
      };
    });

    return NextResponse.json(mapped, { status: 200 });
  } catch (err) {
    console.error("GET /api/restaurant-tables error", err);
    return NextResponse.json(
      { message: "Failed to fetch restaurant tables" },
      { status: 500 },
    );
  }
}
