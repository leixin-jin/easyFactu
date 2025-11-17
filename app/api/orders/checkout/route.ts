import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import {
  menuItems,
  orderItems,
  orders,
  restaurantTables,
  transactions,
} from "@/db/schema";

const checkoutModeSchema = z.enum(["full", "aa"]);

const aaItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

const checkoutBodySchema = z.object({
  tableId: z.string().uuid(),
  orderId: z.string().uuid(),
  mode: checkoutModeSchema.default("full"),
  paymentMethod: z.string().min(1),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  clientSubtotal: z.number().nonnegative(),
  clientTotal: z.number().nonnegative(),
  receivedAmount: z.number().nonnegative().optional(),
  changeAmount: z.number().nonnegative().optional(),
  aaItems: z.array(aaItemInputSchema).optional(),
});

function parseNumeric(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = checkoutBodySchema.safeParse(json);

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
      tableId,
      orderId,
      mode,
      paymentMethod,
      discountPercent = 0,
      clientSubtotal,
      clientTotal,
      receivedAmount,
    } = parseResult.data;

    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [table] = await tx
        .select({
          id: restaurantTables.id,
          number: restaurantTables.number,
        })
        .from(restaurantTables)
        .where(eq(restaurantTables.id, tableId))
        .limit(1);

      if (!table) {
        return NextResponse.json(
          { error: "Table not found", code: "TABLE_NOT_FOUND" },
          { status: 404 },
        );
      }

      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.tableId, tableId)))
        .limit(1);

      if (!order) {
        return NextResponse.json(
          { error: "Order not found", code: "ORDER_NOT_FOUND" },
          { status: 404 },
        );
      }

      if (order.status !== "open") {
        return NextResponse.json(
          { error: "Order is not open", code: "ORDER_NOT_OPEN" },
          { status: 409 },
        );
      }

      if (mode === "aa") {
        return NextResponse.json(
          {
            error: "AA 结账暂未实现",
            code: "AA_CHECKOUT_NOT_IMPLEMENTED",
          },
          { status: 501 },
        );
      }

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
        .where(eq(orderItems.orderId, order.id))
        .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt));

      if (rows.length === 0) {
        return NextResponse.json(
          {
            error: "Order has no items",
            code: "ORDER_EMPTY",
          },
          { status: 400 },
        );
      }

      const dbSubtotal = rows.reduce((sum, row) => {
        const price = parseNumeric(row.price);
        return sum + price * row.quantity;
      }, 0);

      const discountRate = discountPercent > 0 ? discountPercent / 100 : 0;
      const discountAmount = dbSubtotal * discountRate;
      const calculatedTotal = dbSubtotal - discountAmount;

      const epsilon = 0.01;

      if (Math.abs(clientSubtotal - dbSubtotal) > epsilon) {
        return NextResponse.json(
          {
            error: "Client subtotal does not match server subtotal",
            code: "SUBTOTAL_MISMATCH",
            detail: {
              clientSubtotal,
              serverSubtotal: Number(dbSubtotal.toFixed(2)),
            },
          },
          { status: 409 },
        );
      }

      if (Math.abs(clientTotal - calculatedTotal) > epsilon) {
        return NextResponse.json(
          {
            error: "Client total does not match server total",
            code: "TOTAL_MISMATCH",
            detail: {
              clientTotal,
              serverTotal: Number(calculatedTotal.toFixed(2)),
            },
          },
          { status: 409 },
        );
      }

      const effectiveReceived =
        receivedAmount != null && receivedAmount > 0
          ? receivedAmount
          : calculatedTotal;

      if (effectiveReceived + epsilon < calculatedTotal) {
        return NextResponse.json(
          {
            error: "Received amount is less than total",
            code: "INSUFFICIENT_RECEIVED_AMOUNT",
            detail: {
              receivedAmount: Number(effectiveReceived.toFixed(2)),
              requiredAmount: Number(calculatedTotal.toFixed(2)),
            },
          },
          { status: 400 },
        );
      }

      const changeAmount = Math.max(0, effectiveReceived - calculatedTotal);

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: "paid",
          subtotal: dbSubtotal.toFixed(2),
          discount: discountAmount.toFixed(2),
          total: calculatedTotal.toFixed(2),
          paymentMethod,
          closedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();

      const [transactionRow] = await tx
        .insert(transactions)
        .values({
          type: "income",
          category: "POS checkout",
          amount: calculatedTotal.toFixed(2),
          description: `POS 订单结账 - 桌台 ${table.number}`,
          paymentMethod,
          orderId: order.id,
        })
        .returning();

      await tx
        .update(restaurantTables)
        .set({
          status: "idle",
          amount: "0",
          currentGuests: 0,
          startedAt: null,
        })
        .where(eq(restaurantTables.id, tableId));

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
          price:
            typeof row.price === "string"
              ? parseFloat(row.price)
              : Number(row.price),
          notes: row.notes ?? null,
          createdAt: row.createdAt.toISOString(),
        });
      }

      const batches = Array.from(batchesMap.values()).sort(
        (a, b) => a.batchNo - b.batchNo,
      );

      return {
        order: {
          id: updatedOrder.id,
          tableId: updatedOrder.tableId,
          status: updatedOrder.status,
          subtotal: parseNumeric(updatedOrder.subtotal),
          discount: parseNumeric(updatedOrder.discount),
          total: parseNumeric(updatedOrder.total),
          paymentMethod: updatedOrder.paymentMethod ?? null,
          createdAt: updatedOrder.createdAt.toISOString(),
          closedAt: updatedOrder.closedAt
            ? updatedOrder.closedAt.toISOString()
            : null,
        },
        batches,
        transaction: transactionRow
          ? {
            id: transactionRow.id,
            type: transactionRow.type,
            category: transactionRow.category,
            amount: parseNumeric(transactionRow.amount),
            paymentMethod: transactionRow.paymentMethod,
            orderId: transactionRow.orderId,
            date:
              transactionRow.date instanceof Date
                ? transactionRow.date.toISOString().slice(0, 10)
                : String(transactionRow.date),
            createdAt: transactionRow.createdAt.toISOString(),
          }
          : null,
        table: {
          id: table.id,
          number: table.number,
        },
        meta: {
          receivedAmount: Number(effectiveReceived.toFixed(2)),
          changeAmount: Number(changeAmount.toFixed(2)),
        },
      };
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/orders/checkout error", err);
    return NextResponse.json(
      {
        error: "Failed to checkout order",
        detail: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}
