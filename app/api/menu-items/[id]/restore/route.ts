import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { toMenuItemResponse } from "@/app/api/menu-items/utils";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "Invalid menu item id" },
      { status: 400 },
    );
  }

  try {
    const db = getDb();

    // Check if item exists and is currently unavailable (deleted)
    const [existing] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }

    if (existing.available === true) {
      return NextResponse.json(
        { error: "Menu item is not deleted" },
        { status: 404 },
      );
    }

    // Check for conflict: same name + category already exists and is available
    const [conflict] = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.name, existing.name),
          eq(menuItems.category, existing.category),
          eq(menuItems.available, true),
        ),
      )
      .limit(1);

    if (conflict) {
      return NextResponse.json(
        {
          error: "Cannot restore: a menu item with the same name already exists in this category",
          code: "RESTORE_CONFLICT",
        },
        { status: 409 },
      );
    }

    const [restored] = await db
      .update(menuItems)
      .set({
        available: true,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();

    if (!restored) {
      return NextResponse.json(
        { error: "Failed to restore menu item" },
        { status: 500 },
      );
    }

    return NextResponse.json(toMenuItemResponse(restored), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/menu-items/[id]/restore error", err);
    return NextResponse.json(
      {
        error: "Failed to restore menu item",
        detail: message,
      },
      { status: 500 },
    );
  }
}
