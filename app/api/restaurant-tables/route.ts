import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { restaurantTables } from "@/db/schema";

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
      })
      .from(restaurantTables);
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /api/restaurant-tables error", err);
    return NextResponse.json(
      { message: "Failed to fetch restaurant tables" },
      { status: 500 },
    );
  }
}

