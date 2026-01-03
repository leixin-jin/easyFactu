import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { updateMenuItem, deleteMenuItem } from "@/services/menu";
import { updateMenuItemInputSchema } from "@/lib/contracts/menu";
import { uuidParamSchema } from "@/lib/contracts/common";
import { ConflictError, NotFoundError } from "@/lib/http/errors";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const idParse = uuidParamSchema.safeParse({ id });
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

  const parseResult = updateMenuItemInputSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const result = await updateMenuItem(db, id, parseResult.data);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }

    if (err instanceof ConflictError) {
      return NextResponse.json(
        {
          error: "Menu item already exists in this category",
          code: "MENU_ITEM_EXISTS",
        },
        { status: 409 },
      );
    }

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

  const idParse = uuidParamSchema.safeParse({ id });
  if (!idParse.success) {
    return NextResponse.json(
      { error: "Invalid menu item id" },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const result = await deleteMenuItem(db, id);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 },
      );
    }

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
