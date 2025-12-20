import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  transactions,
  transactionItems,
  orderItems,
  orders,
  restaurantTables,
} from "@/db/schema";
import { parseMoney, toMoneyString } from "@/lib/money";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: transactionId } = await params;

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "Transaction ID is required", code: "INVALID_ID" },
        { status: 400 },
      );
    }

    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [transaction] = await tx
        .select({
          id: transactions.id,
          type: transactions.type,
          amount: transactions.amount,
          orderId: transactions.orderId,
          paymentMethod: transactions.paymentMethod,
        })
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1);

      if (!transaction) {
        return NextResponse.json(
          { error: "Transaction not found", code: "TRANSACTION_NOT_FOUND" },
          { status: 404 },
        );
      }

      if (transaction.type !== "income") {
        return NextResponse.json(
          { error: "Only income transactions can be reversed", code: "INVALID_TRANSACTION_TYPE" },
          { status: 400 },
        );
      }

      const items = await tx
        .select({
          id: transactionItems.id,
          orderItemId: transactionItems.orderItemId,
          quantity: transactionItems.quantity,
          unitPrice: transactionItems.unitPrice,
        })
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, transactionId));

      if (items.length === 0) {
        return NextResponse.json(
          { error: "该结算单无法反结算（缺少明细）", code: "NO_TRANSACTION_ITEMS" },
          { status: 400 },
        );
      }

      if (!transaction.orderId) {
        return NextResponse.json(
          { error: "Transaction has no associated order", code: "NO_ORDER_ID" },
          { status: 400 },
        );
      }

      const [order] = await tx
        .select({
          id: orders.id,
          tableId: orders.tableId,
          status: orders.status,
        })
        .from(orders)
        .where(eq(orders.id, transaction.orderId))
        .limit(1);

      if (!order) {
        return NextResponse.json(
          { error: "Associated order not found", code: "ORDER_NOT_FOUND" },
          { status: 404 },
        );
      }

      let tableId = order.tableId;
      let tableNumber: string | null = null;

      if (tableId) {
        const [table] = await tx
          .select({
            id: restaurantTables.id,
            number: restaurantTables.number,
          })
          .from(restaurantTables)
          .where(eq(restaurantTables.id, tableId))
          .limit(1);

        if (table) {
          tableNumber = table.number;
        }

        // 始终检查是否有其他 open 订单，不依赖桌台状态
        const [existingOpenOrder] = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.tableId, tableId),
              eq(orders.status, "open"),
            ),
          )
          .limit(1);

        if (existingOpenOrder && existingOpenOrder.id !== order.id) {
          console.error(`Reversal blocked: table ${tableNumber} has open order ${existingOpenOrder.id}, transaction order is ${order.id}`);
          return NextResponse.json(
            {
              error: "桌台已有其他打开的订单，无法反结算",
              code: "TABLE_HAS_OPEN_ORDER",
              detail: {
                tableId,
                tableNumber,
                existingOrderId: existingOpenOrder.id,
                transactionOrderId: order.id,
              },
            },
            { status: 409 },
          );
        }
      }

      for (const item of items) {
        const [orderItem] = await tx
          .select({
            id: orderItems.id,
            paidQuantity: orderItems.paidQuantity,
          })
          .from(orderItems)
          .where(eq(orderItems.id, item.orderItemId))
          .limit(1);

        if (orderItem) {
          const newPaidQty = Math.max(0, (orderItem.paidQuantity ?? 0) - item.quantity);
          await tx
            .update(orderItems)
            .set({ paidQuantity: newPaidQty })
            .where(eq(orderItems.id, item.orderItemId));
        }
      }

      await tx.delete(transactions).where(eq(transactions.id, transactionId));

      const remainingTransactions = await tx
        .select({
          totalAmount: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(eq(transactions.orderId, order.id));

      const newPaidAmount = parseMoney(remainingTransactions[0]?.totalAmount ?? "0");

      const orderItemsRows = await tx
        .select({
          price: orderItems.price,
          quantity: orderItems.quantity,
          paidQuantity: orderItems.paidQuantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      let newSubtotal = 0;
      let hasUnpaidItems = false;
      for (const row of orderItemsRows) {
        const price = parseMoney(row.price);
        newSubtotal += price * row.quantity;
        if ((row.paidQuantity ?? 0) < row.quantity) {
          hasUnpaidItems = true;
        }
      }

      const newStatus = hasUnpaidItems ? "open" : "paid";
      const newTotal = newPaidAmount;

      await tx
        .update(orders)
        .set({
          status: newStatus,
          subtotal: toMoneyString(newSubtotal),
          discount: "0",
          total: toMoneyString(newTotal),
          paidAmount: toMoneyString(newPaidAmount),
          closedAt: newStatus === "open" ? null : new Date(),
        })
        .where(eq(orders.id, order.id));

      if (tableId && newStatus === "open") {
        const unpaidSubtotal = orderItemsRows.reduce((sum, row) => {
          const unpaidQty = row.quantity - (row.paidQuantity ?? 0);
          return sum + parseMoney(row.price) * unpaidQty;
        }, 0);

        await tx
          .update(restaurantTables)
          .set({
            status: "occupied",
            amount: toMoneyString(unpaidSubtotal),
            startedAt: new Date(),
          })
          .where(eq(restaurantTables.id, tableId));
      }

      console.info(`Transaction ${transactionId} reversed successfully, order ${order.id} status: ${newStatus}`);

      return {
        success: true,
        orderId: order.id,
        orderStatus: newStatus,
        tableNumber,
        reversedAmount: parseMoney(transaction.amount),
        newPaidAmount,
      };
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/transactions/[id]/reverse error", err);
    return NextResponse.json(
      { error: "Failed to reverse transaction", detail: message },
      { status: 500 },
    );
  }
}
