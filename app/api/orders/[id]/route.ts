import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { menuItems, orderItems, orders } from "@/db/schema";

const patchBodySchema = z.object({
  type: z.enum(["decrement", "remove"]),
});

export async function PATCH(
  req: NextRequest,
  context: { params: any },
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

      const priceValue =
        typeof item.price === "string"
          ? parseFloat(item.price)
          : Number(item.price);

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

      let newSubtotal = existingSubtotal;

      if (type === "decrement") {
        const newQuantity = item.quantity - 1;
        if (newQuantity > 0) {
          await tx
            .update(orderItems)
            .set({ quantity: newQuantity })
            .where(eq(orderItems.id, item.id));
          newSubtotal = existingSubtotal - priceValue;
        } else {
          await tx.delete(orderItems).where(eq(orderItems.id, item.id));
          newSubtotal = existingSubtotal - priceValue * item.quantity;
        }
      } else {
        await tx.delete(orderItems).where(eq(orderItems.id, item.id));
        newSubtotal = existingSubtotal - priceValue * item.quantity;
      }

      if (newSubtotal < 0) {
        newSubtotal = 0;
      }

      const newTotal = newSubtotal - existingDiscount;

      await tx
        .update(orders)
        .set({
          subtotal: newSubtotal.toFixed(2),
          total: newTotal.toFixed(2),
        })
        .where(eq(orders.id, currentOrder.id));

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

      const updatedSubtotal = newSubtotal;
      const updatedTotal = newTotal;

      return {
        order: {
          id: currentOrder.id,
          tableId: currentOrder.tableId,
          status: currentOrder.status,
          subtotal: updatedSubtotal,
          discount: existingDiscount,
          total: updatedTotal,
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
  } catch (err: any) {
    console.error("PATCH /api/orders/[id] error", err);
    return NextResponse.json(
      {
        error: "Failed to update order item",
        detail: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}
