import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { orders, restaurantTables } from "@/db/schema";

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
        orderSubtotal: orders.subtotal,
        orderTotal: orders.total,
      })
      .from(restaurantTables)
      .leftJoin(
        orders,
        and(eq(orders.tableId, restaurantTables.id), eq(orders.status, "open")),
      );

    const mapped = rows.map((row) => {
      const subtotal = row.orderSubtotal;
      const total = row.orderTotal;

      const parseAmount = (value: unknown): number | null => {
        if (value == null) return null;
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const n = parseFloat(value);
          return Number.isNaN(n) ? null : n;
        }
        return null;
      };

      const amount =
        parseAmount(total) !== null
          ? parseAmount(total)
          : parseAmount(subtotal);

      return {
        id: row.id,
        number: row.number,
        capacity: row.capacity,
        status: row.status,
        area: row.area,
        amount,
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
