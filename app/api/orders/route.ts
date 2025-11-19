import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, max } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems, orderItems, orders, restaurantTables } from "@/db/schema";

const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  notes: z.string().max(500).optional().nullable(),
});

const orderCreateSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(orderItemInputSchema).min(1),
  paymentMethod: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parseResult = orderCreateSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          detail: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { tableId, items, paymentMethod } = parseResult.data;
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

      // 桌台一旦有下单行为，状态自动标记为 occupied
      await tx
        .update(restaurantTables)
        .set({ status: "occupied" })
        .where(eq(restaurantTables.id, tableId));

      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, tableId), eq(orders.status, "open")))
        .orderBy(asc(orders.createdAt))
        .limit(1);

      const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      let currentOrder = existingOrder;

      if (!currentOrder) {
        const [created] = await tx
          .insert(orders)
          .values({
            tableId,
            status: "open",
            paymentMethod: paymentMethod ?? null,
            subtotal: itemsSubtotal.toFixed(2),
            discount: "0",
            total: itemsSubtotal.toFixed(2),
          })
          .returning();

        currentOrder = created;
      } else {
        const existingSubtotal =
          currentOrder.subtotal != null
            ? typeof currentOrder.subtotal === "string"
              ? parseFloat(currentOrder.subtotal)
              : Number(currentOrder.subtotal)
            : 0;

        const existingDiscount =
          currentOrder.discount != null
            ? typeof currentOrder.discount === "string"
              ? parseFloat(currentOrder.discount)
              : Number(currentOrder.discount)
            : 0;

        const newSubtotal = existingSubtotal + itemsSubtotal;
        const newTotal = newSubtotal - existingDiscount;

        await tx
          .update(orders)
          .set({
            subtotal: newSubtotal.toFixed(2),
            total: newTotal.toFixed(2),
            paymentMethod: paymentMethod ?? currentOrder.paymentMethod,
          })
          .where(eq(orders.id, currentOrder.id));
      }

      const [{ maxBatch }] = await tx
        .select({
          maxBatch: max(orderItems.batchNo),
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, currentOrder.id));

      const nextBatchNo = (maxBatch ?? 0) + 1;

      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: currentOrder.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          notes: item.notes ?? null,
          batchNo: nextBatchNo,
        })),
      );

      const rows = await tx
        .select({
          id: orderItems.id,
          batchNo: orderItems.batchNo,
          quantity: orderItems.quantity,
          price: orderItems.price,
          notes: orderItems.notes,
          createdAt: orderItems.createdAt,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          nameEn: menuItems.nameEn,
        })
        .from(orderItems)
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, currentOrder.id))
        .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt));

      const batchesMap = new Map<
        number,
        {
          batchNo: number;
          items: Array<{
            id: string;
            menuItemId: string;
            name: string;
            nameEn: string;
            quantity: number;
            price: number;
            notes: string | null;
            createdAt: string;
          }>;
        }
      >();

      for (const row of rows) {
        const batchNo = row.batchNo ?? 1;
        if (!batchesMap.has(batchNo)) {
          batchesMap.set(batchNo, {
            batchNo,
            items: [],
          });
        }
        const batch = batchesMap.get(batchNo)!;
        batch.items.push({
          id: row.id,
          menuItemId: row.menuItemId,
          name: row.name ?? "",
          nameEn: row.nameEn ?? "",
          quantity: row.quantity,
          price: typeof row.price === "string" ? parseFloat(row.price) : Number(row.price),
          notes: row.notes ?? null,
          createdAt: row.createdAt.toISOString(),
        });
      }

      const batches = Array.from(batchesMap.values()).sort((a, b) => a.batchNo - b.batchNo);

      return {
        order: {
          id: currentOrder.id,
          tableId: currentOrder.tableId,
          status: currentOrder.status,
          subtotal:
            currentOrder.subtotal != null
              ? typeof currentOrder.subtotal === "string"
                ? parseFloat(currentOrder.subtotal)
                : Number(currentOrder.subtotal)
              : 0,
          discount:
            currentOrder.discount != null
              ? typeof currentOrder.discount === "string"
                ? parseFloat(currentOrder.discount)
                : Number(currentOrder.discount)
              : 0,
          total:
            currentOrder.total != null
              ? typeof currentOrder.total === "string"
                ? parseFloat(currentOrder.total)
                : Number(currentOrder.total)
              : 0,
          paymentMethod: currentOrder.paymentMethod ?? null,
          createdAt: currentOrder.createdAt.toISOString(),
          closedAt: currentOrder.closedAt ? currentOrder.closedAt.toISOString() : null,
        },
        batches,
      };
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("POST /api/orders error", err);
    return NextResponse.json(
      {
        error: "Failed to create order batch",
        detail: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");

    if (!tableId) {
      return NextResponse.json(
        { error: "Missing tableId" },
        { status: 400 },
      );
    }

    const db = getDb();

    const [table] = await db
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

    const [currentOrder] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tableId, tableId), eq(orders.status, "open")))
      .orderBy(asc(orders.createdAt))
      .limit(1);

    if (!currentOrder) {
      return NextResponse.json(
        {
          order: null,
          batches: [],
        },
        { status: 200 },
      );
    }

    const rows = await db
      .select({
        id: orderItems.id,
        batchNo: orderItems.batchNo,
        quantity: orderItems.quantity,
        price: orderItems.price,
        notes: orderItems.notes,
        createdAt: orderItems.createdAt,
        menuItemId: orderItems.menuItemId,
        name: menuItems.name,
        nameEn: menuItems.nameEn,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, currentOrder.id))
      .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt));

    const batchesMap = new Map<
      number,
      {
        batchNo: number;
        items: Array<{
          id: string;
          menuItemId: string;
          name: string;
          nameEn: string;
          quantity: number;
          price: number;
          notes: string | null;
          createdAt: string;
        }>;
      }
    >();

    for (const row of rows) {
      const batchNo = row.batchNo ?? 1;
      if (!batchesMap.has(batchNo)) {
        batchesMap.set(batchNo, {
          batchNo,
          items: [],
        });
      }
      const batch = batchesMap.get(batchNo)!;
      batch.items.push({
        id: row.id,
        menuItemId: row.menuItemId,
        name: row.name ?? "",
        nameEn: row.nameEn ?? "",
        quantity: row.quantity,
        price: typeof row.price === "string" ? parseFloat(row.price) : Number(row.price),
        notes: row.notes ?? null,
        createdAt: row.createdAt.toISOString(),
      });
    }

    const batches = Array.from(batchesMap.values()).sort((a, b) => a.batchNo - b.batchNo);

    return NextResponse.json(
      {
        order: {
          id: currentOrder.id,
          tableId: currentOrder.tableId,
          status: currentOrder.status,
          subtotal:
            currentOrder.subtotal != null
              ? typeof currentOrder.subtotal === "string"
                ? parseFloat(currentOrder.subtotal)
                : Number(currentOrder.subtotal)
              : 0,
          discount:
            currentOrder.discount != null
              ? typeof currentOrder.discount === "string"
                ? parseFloat(currentOrder.discount)
                : Number(currentOrder.discount)
              : 0,
          total:
            currentOrder.total != null
              ? typeof currentOrder.total === "string"
                ? parseFloat(currentOrder.total)
                : Number(currentOrder.total)
              : 0,
          paymentMethod: currentOrder.paymentMethod ?? null,
          createdAt: currentOrder.createdAt.toISOString(),
          closedAt: currentOrder.closedAt ? currentOrder.closedAt.toISOString() : null,
        },
        batches,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("GET /api/orders error", err);
    return NextResponse.json(
      {
        error: "Failed to fetch orders for table",
        detail: message,
      },
      { status: 500 },
    );
  }
}
