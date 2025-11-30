import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, max } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems, orderItems, orders, restaurantTables } from "@/db/schema";
import { parseMoney, toMoneyString } from "@/lib/money";
import { buildOrderBatches, type OrderItemRow } from "@/lib/order-utils";

const transferItemSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const transferSchema = z.object({
  mode: z.enum(["split", "merge"]),
  sourceTableId: z.string().uuid(),
  targetTableId: z.string().uuid(),
  items: z.array(transferItemSchema).default([]),
  moveAll: z.boolean().optional().default(false),
});

function mapOrderSummary(row: (typeof orders.$inferSelect) | null) {
  if (!row) return null;
  return {
    id: row.id,
    tableId: row.tableId,
    status: row.status,
    subtotal: parseMoney(row.subtotal),
    discount: parseMoney(row.discount),
    total: parseMoney(row.total),
    totalAmount: parseMoney((row as { totalAmount?: unknown }).totalAmount ?? 0),
    paidAmount: parseMoney((row as { paidAmount?: unknown }).paidAmount ?? 0),
    paymentMethod: row.paymentMethod ?? null,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
  };
}

function calculateOutstanding(rows: Array<OrderItemRow & { paidQuantity?: number | null }>) {
  return rows.reduce((sum, row) => {
    const price = parseMoney(row.price);
    const paidQty = row.paidQuantity ?? 0;
    const remaining = row.quantity - paidQty;
    if (remaining > 0) {
      return sum + price * remaining;
    }
    return sum;
  }, 0);
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = transferSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          detail: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { mode, sourceTableId, targetTableId, items, moveAll } = parseResult.data;

    if (sourceTableId === targetTableId) {
      return NextResponse.json(
        { error: "Source and target tables cannot be the same" },
        { status: 400 },
      );
    }

    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [sourceTable] = await tx
        .select({ id: restaurantTables.id, number: restaurantTables.number })
        .from(restaurantTables)
        .where(eq(restaurantTables.id, sourceTableId))
        .limit(1);

      const [targetTable] = await tx
        .select({ id: restaurantTables.id, number: restaurantTables.number })
        .from(restaurantTables)
        .where(eq(restaurantTables.id, targetTableId))
        .limit(1);

      if (!sourceTable || !targetTable) {
        return NextResponse.json(
          { error: "Table not found", code: "TABLE_NOT_FOUND" },
          { status: 404 },
        );
      }

      const [sourceOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, sourceTableId), eq(orders.status, "open")))
        .limit(1);

      if (!sourceOrder) {
        return NextResponse.json(
          { error: "Source table has no open order", code: "ORDER_NOT_FOUND" },
          { status: 404 },
        );
      }

      const sourcePaidAmount = parseMoney((sourceOrder as { paidAmount?: unknown }).paidAmount ?? 0);
      if (sourcePaidAmount > 0) {
        return NextResponse.json(
          { error: "Source order has paid items, cannot transfer", code: "SOURCE_ORDER_PAID" },
          { status: 409 },
        );
      }

      const sourceItems = await tx
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
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
        .where(eq(orderItems.orderId, sourceOrder.id))
        .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt));

      const outstandingItems = sourceItems
        .map((row) => {
          const paid = row.paidQuantity ?? 0;
          return {
            ...row,
            available: row.quantity - paid,
            unitPrice: parseMoney(row.price),
          };
        })
        .filter((row) => row.available > 0);

      if (outstandingItems.length === 0) {
        return NextResponse.json(
          { error: "No transferable items on source table", code: "NO_ITEMS" },
          { status: 400 },
        );
      }

      const requested = moveAll || items.length === 0 ? outstandingItems.map((row) => ({
        orderItemId: row.id,
        quantity: row.available,
      })) : items;

      if (requested.length === 0) {
        return NextResponse.json(
          { error: "No items selected", code: "NO_ITEMS_SELECTED" },
          { status: 400 },
        );
      }

      const sourceMap = new Map(outstandingItems.map((row) => [row.id, row]));

      let transferTotal = 0;

      for (const reqItem of requested) {
        const row = sourceMap.get(reqItem.orderItemId);
        if (!row) {
          return NextResponse.json(
            { error: "Order item not found on source order", code: "ORDER_ITEM_NOT_FOUND" },
            { status: 404 },
          );
        }
        if (row.paidQuantity && row.paidQuantity > 0) {
          return NextResponse.json(
            { error: "Paid items cannot be transferred", code: "PAID_ITEM_TRANSFER_FORBIDDEN" },
            { status: 409 },
          );
        }
        if (reqItem.quantity > row.available) {
          return NextResponse.json(
            {
              error: "Transfer quantity exceeds available amount",
              code: "TRANSFER_QUANTITY_EXCEEDS_AVAILABLE",
            },
            { status: 400 },
          );
        }
        transferTotal += row.unitPrice * reqItem.quantity;
      }

      const [targetOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, targetTableId), eq(orders.status, "open")))
        .limit(1);

      const targetPaidAmount = targetOrder
        ? parseMoney((targetOrder as { paidAmount?: unknown }).paidAmount ?? 0)
        : 0;

      if (targetPaidAmount > 0) {
        return NextResponse.json(
          { error: "Target order has paid items, cannot merge", code: "TARGET_ORDER_PAID" },
          { status: 409 },
        );
      }

      const existingTargetSubtotal = targetOrder ? parseMoney(targetOrder.subtotal) : 0;
      const existingTargetDiscount = targetOrder ? parseMoney(targetOrder.discount) : 0;
      const existingTargetTotalAmount = targetOrder
        ? parseMoney((targetOrder as { totalAmount?: unknown }).totalAmount ?? 0)
        : 0;

      const existingSourceSubtotal = parseMoney(sourceOrder.subtotal);
      const existingSourceDiscount = parseMoney(sourceOrder.discount);
      const existingSourceTotalAmount = parseMoney(
        (sourceOrder as { totalAmount?: unknown }).totalAmount ?? 0,
      );

      // 更新来源订单的 order_items
      for (const reqItem of requested) {
        const row = sourceMap.get(reqItem.orderItemId)!;
        const remaining = row.quantity - reqItem.quantity;
        if (remaining <= 0) {
          await tx.delete(orderItems).where(eq(orderItems.id, row.id));
        } else {
          await tx
            .update(orderItems)
            .set({ quantity: remaining })
            .where(eq(orderItems.id, row.id));
        }
      }

      // 在目标订单上插入新的 order_items
      let targetOrderId = targetOrder?.id ?? "";
      if (!targetOrder) {
        const [created] = await tx
          .insert(orders)
          .values({
            tableId: targetTableId,
            status: "open",
            subtotal: toMoneyString(transferTotal),
            discount: "0",
            total: toMoneyString(transferTotal),
            totalAmount: toMoneyString(transferTotal),
            paidAmount: "0",
          })
          .returning();
        targetOrderId = created.id;
      }

      const [{ maxBatch: targetMaxBatch }] = await tx
        .select({ maxBatch: max(orderItems.batchNo) })
        .from(orderItems)
        .where(eq(orderItems.orderId, targetOrderId));

      const targetBatchNo = (targetMaxBatch ?? 0) + 1;

      await tx.insert(orderItems).values(
        requested.map((reqItem) => {
          const row = sourceMap.get(reqItem.orderItemId)!;
          return {
            orderId: targetOrderId,
            menuItemId: row.menuItemId,
            quantity: reqItem.quantity,
            paidQuantity: 0,
            price: toMoneyString(row.unitPrice),
            notes: row.notes ?? null,
            batchNo: targetBatchNo,
          };
        }),
      );

      const newSourceSubtotal = Math.max(0, existingSourceSubtotal - transferTotal);
      const newSourceTotalAmount = Math.max(0, existingSourceTotalAmount - transferTotal);
      const newSourceTotal = Math.max(0, newSourceSubtotal - existingSourceDiscount);

      const newTargetSubtotal = existingTargetSubtotal + transferTotal;
      const newTargetTotalAmount = existingTargetTotalAmount + transferTotal;
      const newTargetTotal = Math.max(0, newTargetSubtotal - existingTargetDiscount);

      // 更新来源订单（如果还有未结清项目则保留，否则标记为空）
      let sourceResultOrder: (typeof orders.$inferSelect) | null = sourceOrder;
      const remainingRows = await tx
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
        .where(eq(orderItems.orderId, sourceOrder.id))
        .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt));

      if (remainingRows.length === 0) {
        await tx
          .update(orders)
          .set({
            status: "cancelled",
            subtotal: "0",
            total: "0",
            discount: sourceOrder.discount ?? "0",
            totalAmount: "0",
            paidAmount: "0",
            closedAt: new Date(),
          })
          .where(eq(orders.id, sourceOrder.id));

        await tx
          .update(restaurantTables)
          .set({ status: "idle", amount: "0" })
          .where(eq(restaurantTables.id, sourceTableId));

        sourceResultOrder = null;
      } else {
        const remainingOutstanding = calculateOutstanding(remainingRows as OrderItemRow[]);
        const [updated] = await tx
          .update(orders)
          .set({
            subtotal: toMoneyString(newSourceSubtotal),
            total: toMoneyString(newSourceTotal),
            totalAmount: toMoneyString(newSourceTotalAmount),
            discount: sourceOrder.discount ?? "0",
            status: "open",
            closedAt: null,
          })
          .where(eq(orders.id, sourceOrder.id))
          .returning();

        await tx
          .update(restaurantTables)
          .set({
            status: "occupied",
            amount: toMoneyString(remainingOutstanding),
          })
          .where(eq(restaurantTables.id, sourceTableId));

        sourceResultOrder = updated;
      }

      // 更新目标订单
      const targetRows = await tx
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
        .where(eq(orderItems.orderId, targetOrderId))
        .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt));

      const targetOutstanding = calculateOutstanding(targetRows as OrderItemRow[]);

      const [updatedTarget] = await tx
        .update(orders)
        .set({
          subtotal: toMoneyString(newTargetSubtotal),
          total: toMoneyString(newTargetTotal),
          totalAmount: toMoneyString(newTargetTotalAmount),
          status: "open",
          discount: targetOrder?.discount ?? "0",
          closedAt: null,
        })
        .where(eq(orders.id, targetOrderId))
        .returning();

      await tx
        .update(restaurantTables)
        .set({
          status: "occupied",
          amount: toMoneyString(targetOutstanding),
        })
        .where(eq(restaurantTables.id, targetTableId));

      const sourceBatches = sourceResultOrder
        ? buildOrderBatches(remainingRows as OrderItemRow[], { omitFullyPaid: true })
        : [];
      const targetBatches = buildOrderBatches(targetRows as OrderItemRow[], { omitFullyPaid: true });

      return {
        source: {
          tableId: sourceTable.id,
          order: sourceResultOrder ? mapOrderSummary(sourceResultOrder) : null,
          batches: sourceBatches,
        },
        target: {
          tableId: targetTable.id,
          order: mapOrderSummary(updatedTarget),
          batches: targetBatches,
        },
      };
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/orders/transfer error", err);
    return NextResponse.json(
      {
        error: "Failed to transfer order items",
        detail: message,
      },
      { status: 500 },
    );
  }
}
