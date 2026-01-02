import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { getDeletedMenuItems } from "@/services/menu";

export async function GET() {
  try {
    const db = getDb();
    const items = await getDeletedMenuItems(db);

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
