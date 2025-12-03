import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { orders, restaurantTables } from "@/db/schema";
import { parseMoney } from "@/lib/money";

const createTableSchema = z.object({
  number: z.string().trim().min(1).max(50),
  area: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  capacity: z.coerce.number().int().min(1).max(200),
});

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
      const totalAmount = parseMoney(row.orderTotalAmount);
      const paidAmount = parseMoney(row.orderPaidAmount);

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

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parseResult = createTableSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          detail: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { number, area, capacity } = parseResult.data;

    const db = getDb();

    const [existing] = await db
      .select({ id: restaurantTables.id })
      .from(restaurantTables)
      .where(eq(restaurantTables.number, number))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          error: "Table number already exists",
          code: "TABLE_NUMBER_EXISTS",
        },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(restaurantTables)
      .values({
        number,
        area,
        capacity,
        status: "idle",
        currentGuests: 0,
        amount: "0",
      })
      .returning({
        id: restaurantTables.id,
        number: restaurantTables.number,
        area: restaurantTables.area,
        capacity: restaurantTables.capacity,
        status: restaurantTables.status,
      });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/restaurant-tables error", err);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 },
    );
  }
}
