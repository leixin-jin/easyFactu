import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { updateTableStatus, deleteTable } from "@/services/tables";
import { updateTableStatusInputSchema } from "@/lib/contracts/tables";
import { uuidParamSchema } from "@/lib/contracts/common";
import { AppError, NotFoundError } from "@/lib/http/errors";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const idParse = uuidParamSchema.safeParse({ id });
  if (!idParse.success) {
    return NextResponse.json(
      { error: "Invalid table id" },
      { status: 400 },
    );
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = updateTableStatusInputSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          detail: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const db = getDb();
    const updated = await updateTableStatus(db, id, parseResult.data.status);

    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 },
      );
    }

    const message =
      err instanceof Error ? err.message : String(err);
    console.error("PATCH /api/restaurant-tables/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to update table",
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
      { error: "Invalid table id" },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const deleted = await deleteTable(db, id);

    return NextResponse.json(deleted, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 },
      );
    }

    if (err instanceof AppError && err.code === "TABLE_HAS_OPEN_ORDER") {
      return NextResponse.json(
        {
          error: "Table has open order",
          code: "TABLE_HAS_OPEN_ORDER",
        },
        { status: 409 },
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    console.error("DELETE /api/restaurant-tables/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to delete table",
        detail: message,
      },
      { status: 500 },
    );
  }
}
