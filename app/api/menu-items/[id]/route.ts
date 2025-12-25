import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { toMenuItemResponse } from "@/app/api/menu-items/utils";
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

function hasAtMostTwoDecimals(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded - value) < 1e-6;
}

// Partial update schema - all fields optional
// For nullable fields (nameEn, description, image): empty string means "clear to null"
// For required fields (name, category, price): empty string is invalid
const updateMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  nameEn: z.string().trim().max(120).optional(), // empty string = clear to null
  category: z.string().trim().min(1).max(120).optional(),
  price: coerceMoney
    .refine((value) => Number.isFinite(value) && value > 0, {
      message: "Price must be greater than 0",
    })
    .refine((value) => hasAtMostTwoDecimals(value), {
      message: "Price must have at most two decimals",
    })
    .optional(),
  description: z.string().trim().max(500).optional(), // empty string = clear to null
  image: z.string().trim().max(512).optional(), // empty string = clear to null
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export async function PUT(
  req: NextRequest,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parseResult = updateMenuItemSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { name, nameEn, category, price, description, image } = parseResult.data;

  try {
    const db = getDb();

    // Check if item exists and is available
    const [existing] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id))
      .limit(1);

    if (!existing || existing.available === false) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }

    // Use existing values for name/category if not provided (for duplicate check)
    const finalName = name ?? existing.name;
    const finalCategory = category ?? existing.category;

    // Check for duplicate name in same category (excluding current item)
    const [duplicate] = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.name, finalName),
          eq(menuItems.category, finalCategory),
          eq(menuItems.available, true),
          ne(menuItems.id, id),
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

    // Build update object with only provided fields
    // For nullable fields: empty string means clear to null
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn === "" ? null : nameEn;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = toMoneyString(price);
    if (description !== undefined) updateData.description = description === "" ? null : description;
    if (image !== undefined) updateData.image = image === "" ? null : image;

    const [updated] = await db
      .update(menuItems)
      .set(updateData)
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
    console.error("PUT /api/menu-items/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to update menu item",
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
