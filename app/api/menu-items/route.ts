import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { toMenuItemResponse, type MenuItemResponse } from "@/app/api/menu-items/utils";
import { toMoneyString } from "@/lib/money";

const decimalPattern = /^\d+(\.\d{1,2})?$/;

const coerceMoney = z
  .union([
    z
      .string()
      .trim()
      .refine((value) => decimalPattern.test(value), {
        message: "Amount must be numeric with up to two decimals",
      })
      .transform((value) => Number.parseFloat(value)),
    z.number(),
  ])
  .transform((value) => (typeof value === "number" ? value : value));

const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nameEn: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  category: z.string().trim().min(1).max(120),
  price: coerceMoney
    .refine((value) => Number.isFinite(value) && value > 0, {
      message: "Price must be greater than 0",
    })
    .refine((value) => hasAtMostTwoDecimals(value), {
      message: "Price must have at most two decimals",
    }),
  cost: coerceMoney
    .refine((value) => value >= 0, {
      message: "Cost must be equal or greater than 0",
    })
    .refine((value) => hasAtMostTwoDecimals(value), {
      message: "Cost must have at most two decimals",
    })
    .optional(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  image: z
    .string()
    .trim()
    .max(512)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  available: z.boolean().optional(),
  popular: z.boolean().optional(),
  spicy: z.coerce.number().int().min(0).max(5).optional().default(0),
  allergens: z
    .array(z.string().trim().min(1).max(40))
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

function hasAtMostTwoDecimals(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded - value) < 1e-6;
}

export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.available, true));

    const items = rows.map(toMenuItemResponse);
    const categories = buildCategories(items);

    return NextResponse.json({ categories, items }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/menu-items error", err);
    return NextResponse.json(
      {
        error: "Failed to load menu items",
        detail: message,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parseResult = createMenuItemSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    name,
    nameEn,
    category,
    price,
    cost,
    description,
    image,
    available = true,
    popular = false,
    spicy = 0,
    allergens,
  } = parseResult.data;

  try {
    const db = getDb();

    const [duplicate] = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.name, name),
          eq(menuItems.category, category),
          eq(menuItems.available, true),
        ),
      )
      .limit(1);

    if (duplicate) {
      return NextResponse.json(
        {
          error: "Menu item already exists in this category",
          code: "MENU_ITEM_EXISTS",
        },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(menuItems)
      .values({
        name,
        nameEn,
        category,
        price: toMoneyString(price),
        cost: cost != null ? toMoneyString(cost) : null,
        description,
        image,
        available,
        popular,
        spicy,
        allergens,
      })
      .returning();

    if (!created) {
      return NextResponse.json(
        { error: "Failed to create menu item" },
        { status: 500 },
      );
    }

    return NextResponse.json(toMenuItemResponse(created), { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/menu-items error", err);
    return NextResponse.json(
      {
        error: "Failed to create menu item",
        detail: message,
      },
      { status: 500 },
    );
  }
}

function buildCategories(items: MenuItemResponse[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  return [
    { id: "all", name: "全部菜品", count: items.length },
    ...Array.from(counts.entries()).map(([id, count]) => ({
      id,
      name: id,
      count,
    })),
  ];
}
