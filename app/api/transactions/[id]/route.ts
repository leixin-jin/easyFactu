import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  transactions,
  transactionItems,
  orders,
  restaurantTables,
} from "@/db/schema";
import { parseMoney } from "@/lib/money";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Transaction ID is required", code: "INVALID_ID" },
        { status: 400 },
      );
    }

    const db = getDb();

    const [transaction] = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        category: transactions.category,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        paymentMethod: transactions.paymentMethod,
        orderId: transactions.orderId,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found", code: "TRANSACTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    const items = await db
      .select({
        id: transactionItems.id,
        orderItemId: transactionItems.orderItemId,
        quantity: transactionItems.quantity,
        menuItemId: transactionItems.menuItemId,
        nameSnapshot: transactionItems.nameSnapshot,
        unitPrice: transactionItems.unitPrice,
        createdAt: transactionItems.createdAt,
      })
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, id));

    let tableNumber: string | null = null;
    if (transaction.orderId) {
      const [order] = await db
        .select({
          tableId: orders.tableId,
        })
        .from(orders)
        .where(eq(orders.id, transaction.orderId))
        .limit(1);

      if (order?.tableId) {
        const [table] = await db
          .select({
            number: restaurantTables.number,
          })
          .from(restaurantTables)
          .where(eq(restaurantTables.id, order.tableId))
          .limit(1);

        tableNumber = table?.number ?? null;
      }
    }

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        type: transaction.type,
        category: transaction.category,
        amount: parseMoney(transaction.amount),
        description: transaction.description,
        date: transaction.date,
        paymentMethod: transaction.paymentMethod,
        orderId: transaction.orderId,
        createdAt: transaction.createdAt.toISOString(),
        tableNumber,
      },
      items: items.map((item) => ({
        id: item.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        menuItemId: item.menuItemId,
        nameSnapshot: item.nameSnapshot,
        unitPrice: parseMoney(item.unitPrice),
        createdAt: item.createdAt.toISOString(),
      })),
      hasItems: items.length > 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/transactions/[id] error", err);
    return NextResponse.json(
      { error: "Failed to get transaction", detail: message },
      { status: 500 },
    );
  }
}
