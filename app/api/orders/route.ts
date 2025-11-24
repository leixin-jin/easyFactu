import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems, orderItems, orders, restaurantTables } from "@/db/schema";
import { parseMoney, toMoneyString } from "@/lib/money";
import { buildOrderBatches, type OrderItemRow } from "@/lib/order-utils";

const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
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

      const menuItemIds = Array.from(new Set(items.map((item) => item.menuItemId)));

      const menuRows = await tx
        .select({
          id: menuItems.id,
          price: menuItems.price,
        })
        .from(menuItems)
        .where(inArray(menuItems.id, menuItemIds));

      const priceById = new Map<string, number>();
      for (const row of menuRows) {
        priceById.set(row.id, parseMoney(row.price));
      }

      let itemsSubtotal = 0;
      for (const item of items) {
        const unitPrice = priceById.get(item.menuItemId);
        if (unitPrice == null) {
          return NextResponse.json(
            {
              error: "Menu item not found",
              code: "MENU_ITEM_NOT_FOUND",
              detail: { menuItemId: item.menuItemId },
            },
            { status: 400 },
          );
        }
        itemsSubtotal += unitPrice * item.quantity;
      }

      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, tableId), eq(orders.status, "open")))
        .orderBy(asc(orders.createdAt))
        .limit(1);

      let currentOrder = existingOrder;

      if (!currentOrder) {
        const [created] = await tx
          .insert(orders)
          .values({
            tableId,
            status: "open",
            paymentMethod: paymentMethod ?? null,
            subtotal: toMoneyString(itemsSubtotal),
            discount: "0",
            total: toMoneyString(itemsSubtotal),
            totalAmount: toMoneyString(itemsSubtotal),
            paidAmount: "0",
          })
          .returning();

        currentOrder = created;
      } else {
        const existingSubtotal = parseMoney(currentOrder.subtotal);
        const existingDiscount = parseMoney(currentOrder.discount);
        const existingTotalAmount = parseMoney(
          (currentOrder as { totalAmount?: unknown }).totalAmount ??
            (currentOrder as { total?: unknown }).total ??
            0,
        );

        const newSubtotal = existingSubtotal + itemsSubtotal;
        const newTotal = newSubtotal - existingDiscount;
        const newTotalAmount = existingTotalAmount + itemsSubtotal;

        await tx
          .update(orders)
          .set({
            subtotal: toMoneyString(newSubtotal),
            total: toMoneyString(newTotal),
            totalAmount: toMoneyString(newTotalAmount),
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
        items.map((item) => {
          const unitPrice = priceById.get(item.menuItemId) ?? 0;
          return {
            orderId: currentOrder.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: toMoneyString(unitPrice),
            notes: item.notes ?? null,
            batchNo: nextBatchNo,
          };
        }),
      );

      const rows: OrderItemRow[] = await tx
        .select({
          id: orderItems.id,
          batchNo: orderItems.batchNo,
          quantity: orderItems.quantity,
          paidQuantity: orderItems.paidQuantity,
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

      const batches = buildOrderBatches(rows);

      return {
        order: {
          id: currentOrder.id,
          tableId: currentOrder.tableId,
          status: currentOrder.status,
          subtotal:
            currentOrder.subtotal != null
              ? parseMoney(currentOrder.subtotal)
              : 0,
          discount:
            currentOrder.discount != null
              ? parseMoney(currentOrder.discount)
              : 0,
          total:
            currentOrder.total != null
              ? parseMoney(currentOrder.total)
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
    // 数据库唯一约束：同一桌台仅允许一个 open 订单
    if (typeof err === "object" && err && "code" in err && (err as any).code === "23505") {
      console.error("POST /api/orders unique open-order violation", err);
      return NextResponse.json(
        {
          error: "Open order already exists for table",
          code: "OPEN_ORDER_ALREADY_EXISTS",
          detail: message,
        },
        { status: 409 },
      );
    }
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

    const rows: OrderItemRow[] = await db
      .select({
        id: orderItems.id,
        batchNo: orderItems.batchNo,
        quantity: orderItems.quantity,
        paidQuantity: orderItems.paidQuantity,
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

    const batches = buildOrderBatches(rows, { omitFullyPaid: true });

    return NextResponse.json(
      {
        order: {
          id: currentOrder.id,
          tableId: currentOrder.tableId,
          status: currentOrder.status,
          subtotal: parseMoney(currentOrder.subtotal),
          discount: parseMoney(currentOrder.discount),
          total: parseMoney(currentOrder.total),
          totalAmount: parseMoney(
            (currentOrder as { totalAmount?: unknown }).totalAmount,
          ),
          paidAmount: parseMoney(
            (currentOrder as { paidAmount?: unknown }).paidAmount,
          ),
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
