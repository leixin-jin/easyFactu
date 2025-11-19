import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { restaurantTables } from "@/db/schema";

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
