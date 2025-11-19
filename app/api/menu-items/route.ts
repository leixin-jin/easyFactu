import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.available, true));

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn ?? "",
      category: r.category,
      price: typeof r.price === "string" ? parseFloat(r.price) : Number(r.price),
      image: r.image ?? "",
      available: r.available,
      popular: r.popular ?? false,
      spicy: r.spicy ?? 0,
    }));

    const unique = new Set(items.map((i) => i.category));
    const categories = [{ id: "all", name: "全部" }, ...Array.from(unique).map((id) => ({ id: String(id), name: String(id) }))];

    return NextResponse.json({ categories, items });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Failed to load menu items",
        detail: message,
      },
      { status: 500 },
    );
  }
}
