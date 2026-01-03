import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { restoreMenuItem } from "@/services/menu";
import { uuidParamSchema } from "@/lib/contracts/common";
import { ConflictError, NotFoundError } from "@/lib/http/errors";

export async function POST(
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
    const result = await restoreMenuItem(db, id);

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
          error: "Cannot restore: a menu item with the same name already exists in this category",
          code: "RESTORE_CONFLICT",
        },
        { status: 409 },
      );
    }

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
