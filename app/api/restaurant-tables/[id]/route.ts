import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { orders, restaurantTables } from "@/db/schema";

const updateStatusSchema = z.object({
  status: z.enum(["idle", "occupied"]),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "Invalid table id" },
      { status: 400 },
    );
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = updateStatusSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          detail: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { status } = parseResult.data;
    const db = getDb();

    const [updated] = await db
      .update(restaurantTables)
      .set({ status })
      .where(eq(restaurantTables.id, id))
      .returning({
        id: restaurantTables.id,
        number: restaurantTables.number,
        status: restaurantTables.status,
        area: restaurantTables.area,
        capacity: restaurantTables.capacity,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("PATCH /api/restaurant-tables/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to update table",
        detail: message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "Invalid table id" },
      { status: 400 },
    );
  }

  try {
    const db = getDb();

    const [openOrder] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.tableId, id), eq(orders.status, "open")))
      .limit(1);

    if (openOrder) {
      return NextResponse.json(
        {
          error: "Table has open order",
          code: "TABLE_HAS_OPEN_ORDER",
        },
        { status: 409 },
      );
    }

    const [deleted] = await db
      .delete(restaurantTables)
      .where(eq(restaurantTables.id, id))
      .returning({
        id: restaurantTables.id,
        number: restaurantTables.number,
      });

    if (!deleted) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(deleted, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("DELETE /api/restaurant-tables/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to delete table",
        detail: message,
      },
      { status: 500 },
    );
  }
}
