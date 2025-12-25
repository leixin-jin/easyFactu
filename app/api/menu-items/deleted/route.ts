import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { toMenuItemResponse } from "@/app/api/menu-items/utils";

export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.available, false))
      .orderBy(desc(menuItems.updatedAt));

    const items = rows.map(toMenuItemResponse);

    return NextResponse.json({ items }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/menu-items/deleted error", err);
    return NextResponse.json(
      {
        error: "Failed to load deleted menu items",
        detail: message,
      },
      { status: 500 },
    );
  }
}
