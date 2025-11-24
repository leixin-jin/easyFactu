import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems, orderItems, orders } from "@/db/schema";
import { parseMoney, toMoneyString } from "@/lib/money";
import { buildOrderBatches, type OrderItemRow } from "@/lib/order-utils";

const patchBodySchema = z.object({
  type: z.enum(["decrement", "remove"]),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "Invalid order item id" },
      { status: 400 },
    );
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = patchBodySchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          detail: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { type } = parseResult.data;
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          quantity: orderItems.quantity,
          paidQuantity: orderItems.paidQuantity,
          price: orderItems.price,
        })
        .from(orderItems)
        .where(eq(orderItems.id, id))
        .limit(1);

      if (!item) {
        return NextResponse.json(
          { error: "Order item not found" },
          { status: 404 },
        );
      }

      const [currentOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, item.orderId))
        .limit(1);

      if (!currentOrder) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 },
        );
      }

      const priceValue = parseMoney(item.price);
      const existingSubtotal = parseMoney(currentOrder.subtotal);
      const existingDiscount = parseMoney(currentOrder.discount);
      const existingTotalAmount = parseMoney(
        (currentOrder as { totalAmount?: unknown }).totalAmount ??
          (currentOrder as { total?: unknown }).total ??
          0,
      );

      const alreadyPaidQty = item.paidQuantity ?? 0;
      const availableQty = item.quantity - alreadyPaidQty;

      if (availableQty <= 0) {
        return NextResponse.json(
          {
            error: "Cannot modify item that is already fully paid",
            code: "ITEM_FULLY_PAID",
          },
          { status: 409 },
        );
      }

      let newQuantity = item.quantity;
      let newSubtotal = existingSubtotal;
      let newTotalAmount = existingTotalAmount;

      if (type === "decrement") {
        // 只能在未结算的数量范围内减一
        if (item.quantity - 1 < alreadyPaidQty) {
          return NextResponse.json(
            {
              error: "Cannot decrement below paid quantity",
              code: "DECREMENT_BELOW_PAID_QUANTITY",
            },
            { status: 409 },
          );
        }

        newQuantity = item.quantity - 1;
        const delta = priceValue;
        newSubtotal = existingSubtotal - delta;
        newTotalAmount = existingTotalAmount - delta;

        await tx
          .update(orderItems)
          .set({ quantity: newQuantity })
          .where(eq(orderItems.id, item.id));
      } else {
        // remove：仅允许尚未结算的菜品整行删除
        if (alreadyPaidQty > 0) {
          return NextResponse.json(
            {
              error: "Cannot remove item that is already partially or fully paid",
              code: "REMOVE_PAID_ITEM_FORBIDDEN",
            },
            { status: 409 },
          );
        }

        const delta = priceValue * item.quantity;
        newSubtotal = existingSubtotal - delta;
        newTotalAmount = existingTotalAmount - delta;

        await tx.delete(orderItems).where(eq(orderItems.id, item.id));
        newQuantity = 0;
      }

      if (newSubtotal < 0) {
        newSubtotal = 0;
      }
      if (newTotalAmount < 0) {
        newTotalAmount = 0;
      }

      const newTotal = newSubtotal - existingDiscount;

      await tx
        .update(orders)
        .set({
          subtotal: toMoneyString(newSubtotal),
          total: toMoneyString(newTotal),
          totalAmount: toMoneyString(newTotalAmount),
        })
        .where(eq(orders.id, currentOrder.id));

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

      const batches = buildOrderBatches(rows, { omitFullyPaid: true });

      return {
        order: {
          id: currentOrder.id,
          tableId: currentOrder.tableId,
          status: currentOrder.status,
          subtotal: newSubtotal,
          discount: existingDiscount,
          total: newTotal,
          totalAmount: newTotalAmount,
          paidAmount: parseMoney(
            (currentOrder as { paidAmount?: unknown }).paidAmount,
          ),
          paymentMethod: currentOrder.paymentMethod ?? null,
          createdAt: currentOrder.createdAt.toISOString(),
          closedAt: currentOrder.closedAt
            ? currentOrder.closedAt.toISOString()
            : null,
        },
        batches,
      };
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("PATCH /api/orders/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to update order item",
        detail: message,
      },
      { status: 500 },
    );
  }
}
