import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { toMenuItemResponse } from "@/app/api/menu-items/utils";

export async function DELETE(
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

    const [existing] = await db
      .select({
        id: menuItems.id,
        available: menuItems.available,
      })
      .from(menuItems)
      .where(eq(menuItems.id, id))
      .limit(1);

    if (!existing || existing.available === false) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }

    const [updated] = await db
      .update(menuItems)
      .set({
        available: false,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(toMenuItemResponse(updated), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("DELETE /api/menu-items/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to delete menu item",
        detail: message,
      },
      { status: 500 },
    );
  }
}
