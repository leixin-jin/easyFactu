import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { orderItems, orders, restaurantTables } from "@/db/schema";

const clearOrderSchema = z.object({
  tableId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = clearOrderSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          detail: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { tableId } = parseResult.data;
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [table] = await tx
        .select({ id: restaurantTables.id })
        .from(restaurantTables)
        .where(eq(restaurantTables.id, tableId))
        .limit(1);

      if (!table) {
        return NextResponse.json(
          { error: "Table not found" },
          { status: 404 },
        );
      }

      const [currentOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, tableId), eq(orders.status, "open")))
        .limit(1);

      if (currentOrder) {
        await tx
          .delete(orderItems)
          .where(eq(orderItems.orderId, currentOrder.id));

        await tx
          .update(orders)
          .set({
            status: "cancelled",
            subtotal: "0",
            total: "0",
            discount:
              currentOrder.discount != null
                ? currentOrder.discount
                : "0",
            totalAmount: "0",
            paidAmount: "0",
            closedAt: new Date(),
          })
          .where(eq(orders.id, currentOrder.id));
      }

      // 清空后恢复桌台为空闲
      await tx
        .update(restaurantTables)
        .set({ status: "idle", amount: "0" })
        .where(eq(restaurantTables.id, tableId));

      return {
        order: null,
        batches: [],
      };
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("POST /api/orders/clear error", err);
    return NextResponse.json(
      {
        error: "Failed to clear order",
        detail: message,
      },
      { status: 500 },
    );
  }
}
