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
  transactionItems,
} from "@/db/schema";
import { parseMoney, toMoneyString } from "@/lib/money";
import { buildOrderBatches, type OrderItemRow } from "@/lib/order-utils";

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
  return parseMoney(value);
}

function calculateSubtotals(
  rows: Array<{
    price: unknown;
    quantity: number;
    paidQuantity?: number | null;
  }>,
) {
  let fullSubtotal = 0;
  let outstandingSubtotal = 0;

  for (const row of rows) {
    const price = parseNumeric(row.price);
    fullSubtotal += price * row.quantity;
    const unpaidQty = row.quantity - (row.paidQuantity ?? 0);
    if (unpaidQty > 0) {
      outstandingSubtotal += price * unpaidQty;
    }
  }

  return { fullSubtotal, outstandingSubtotal };
}

function normalizeTransactionDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime())
    ? String(value ?? "")
    : parsed.toISOString().slice(0, 10);
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
      aaItems,
    } = parseResult.data;

    const db = getDb();

    const result = await db.transaction(async (tx) => {
      // 移除了日锁定检查 - 现在使用按点击顺序生成报告的模式，不再锁定当日结账

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

      const rows = await tx
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

      const epsilon = 0.01;

      if (mode === "aa") {
        if (!aaItems || aaItems.length === 0) {
          return NextResponse.json(
            {
              error: "AA items are required",
              code: "AA_ITEMS_REQUIRED",
            },
            { status: 400 },
          );
        }

        const itemsByMenuItem = new Map<
          string,
          {
            totalQuantity: number;
            unpaidQuantity: number;
            rows: Array<
              (typeof rows)[number] & {
                numericPrice: number;
                unpaidQuantity: number;
              }
            >;
          }
        >();

        for (const row of rows) {
          const numericPrice = parseNumeric(row.price);
          const paidQty = row.paidQuantity ?? 0;
          const unpaidQty = row.quantity - paidQty;
          if (unpaidQty <= 0) {
            continue;
          }
          const existing = itemsByMenuItem.get(row.menuItemId) ?? {
            totalQuantity: 0,
            unpaidQuantity: 0,
            rows: [],
          };
          existing.totalQuantity += row.quantity;
          existing.unpaidQuantity += unpaidQty;
          existing.rows.push({
            ...row,
            numericPrice,
            unpaidQuantity: unpaidQty,
          });
          itemsByMenuItem.set(row.menuItemId, existing);
        }

        const aaByMenuItem = new Map<
          string,
          {
            quantity: number;
          }
        >();

        for (const item of aaItems) {
          const existing = aaByMenuItem.get(item.menuItemId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            aaByMenuItem.set(item.menuItemId, {
              quantity: item.quantity,
            });
          }
        }

        for (const [menuItemId, { quantity }] of aaByMenuItem.entries()) {
          const entry = itemsByMenuItem.get(menuItemId);
          const availableQuantity = entry?.unpaidQuantity ?? 0;
          if (availableQuantity < quantity) {
            return NextResponse.json(
              {
                error: "AA quantity exceeds available order quantity",
                code: "AA_QUANTITY_EXCEEDS_ORDER",
                detail: {
                  menuItemId,
                  requestedQuantity: quantity,
                  availableQuantity,
                },
              },
              { status: 400 },
            );
          }
        }

        let aaDbSubtotal = 0;
        const allocationByRowId = new Map<string, number>();

        for (const [menuItemId, { quantity }] of aaByMenuItem.entries()) {
          const entry = itemsByMenuItem.get(menuItemId);
          if (!entry) continue;

          let remaining = quantity;
          for (const row of entry.rows) {
            if (remaining <= 0) break;
            const available = row.unpaidQuantity;
            if (available <= 0) continue;
            const useQty = Math.min(available, remaining);
            if (useQty > 0) {
              const existing = allocationByRowId.get(row.id) ?? 0;
              allocationByRowId.set(row.id, existing + useQty);
              aaDbSubtotal += row.numericPrice * useQty;
              remaining -= useQty;
            }
          }
        }

        const discountRate = discountPercent > 0 ? discountPercent / 100 : 0;
        const aaDiscountAmount = aaDbSubtotal * discountRate;
        const aaCalculatedTotal = aaDbSubtotal - aaDiscountAmount;

        if (Math.abs(clientSubtotal - aaDbSubtotal) > epsilon) {
          return NextResponse.json(
            {
              error: "Client subtotal does not match server subtotal",
              code: "SUBTOTAL_MISMATCH",
              detail: {
                clientSubtotal,
                serverSubtotal: Number(aaDbSubtotal.toFixed(2)),
              },
            },
            { status: 409 },
          );
        }

        if (Math.abs(clientTotal - aaCalculatedTotal) > epsilon) {
          return NextResponse.json(
            {
              error: "Client total does not match server total",
              code: "TOTAL_MISMATCH",
              detail: {
                clientTotal,
                serverTotal: Number(aaCalculatedTotal.toFixed(2)),
              },
            },
            { status: 409 },
          );
        }

        const effectiveReceived =
          receivedAmount != null && receivedAmount > 0
            ? receivedAmount
            : aaCalculatedTotal;

        if (effectiveReceived + epsilon < aaCalculatedTotal) {
          return NextResponse.json(
            {
              error: "Received amount is less than total",
              code: "INSUFFICIENT_RECEIVED_AMOUNT",
              detail: {
                receivedAmount: Number(effectiveReceived.toFixed(2)),
                requiredAmount: Number(aaCalculatedTotal.toFixed(2)),
              },
            },
            { status: 400 },
          );
        }

        const changeAmount = Math.max(0, effectiveReceived - aaCalculatedTotal);

        // 更新已付数量，不删除任何 order_items 行
        for (const row of rows) {
          const deductQty = allocationByRowId.get(row.id) ?? 0;
          if (deductQty <= 0) continue;
          const paidQty = row.paidQuantity ?? 0;
          const newPaidQty = paidQty + deductQty;
          if (newPaidQty > row.quantity) {
            return NextResponse.json(
              {
                error: "AA checkout conflict on item quantity",
                code: "AA_QUANTITY_CONFLICT",
              },
              { status: 409 },
            );
          }

          await tx
            .update(orderItems)
            .set({
              paidQuantity: newPaidQty,
            })
            .where(eq(orderItems.id, row.id));
        }

        // 重新查询，计算整单总额与剩余未结金额
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
          .where(eq(orderItems.orderId, order.id))
          .orderBy(asc(orderItems.batchNo), asc(orderItems.createdAt));

        const { fullSubtotal, outstandingSubtotal: remainingSubtotal } = calculateSubtotals(
          remainingRows as OrderItemRow[],
        );

        const existingTotalAmount = parseNumeric(
          (order as { totalAmount?: unknown }).totalAmount ?? 0,
        );
        const existingPaidAmount = parseNumeric(
          (order as { paidAmount?: unknown }).paidAmount ?? 0,
        );

        const newTotalAmount =
          existingTotalAmount > 0 ? existingTotalAmount : fullSubtotal;
        const newPaidAmount = existingPaidAmount + aaCalculatedTotal;

        let updatedOrder;

        if (remainingSubtotal <= epsilon) {
          [updatedOrder] = await tx
            .update(orders)
            .set({
              status: "paid",
              subtotal: toMoneyString(fullSubtotal),
              discount: "0",
              total: toMoneyString(newPaidAmount),
              totalAmount: toMoneyString(newTotalAmount),
              paidAmount: toMoneyString(newPaidAmount),
              paymentMethod,
              closedAt: new Date(),
            })
            .where(eq(orders.id, order.id))
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
        } else {
          [updatedOrder] = await tx
            .update(orders)
            .set({
              status: "open",
              subtotal: toMoneyString(fullSubtotal),
              discount: "0",
              total: toMoneyString(newPaidAmount),
              totalAmount: toMoneyString(newTotalAmount),
              paidAmount: toMoneyString(newPaidAmount),
              paymentMethod,
              closedAt: null,
            })
            .where(eq(orders.id, order.id))
            .returning();

          await tx
            .update(restaurantTables)
            .set({
              status: "occupied",
              amount: toMoneyString(remainingSubtotal),
            })
            .where(eq(restaurantTables.id, tableId));
        }

        const [transactionRow] = await tx
          .insert(transactions)
          .values({
            type: "income",
            category: "POS checkout - AA",
            amount: toMoneyString(aaCalculatedTotal),
            description: `POS AA 结账 - 桌台 ${table.number}`,
            paymentMethod,
            orderId: order.id,
          })
          .returning();

        // 写入交易明细行 (AA 模式：只写分配的数量)
        const transactionItemsToInsert: Array<{
          transactionId: string;
          orderItemId: string;
          quantity: number;
          menuItemId: string;
          nameSnapshot: string;
          unitPrice: string;
        }> = [];

        for (const [menuItemId, entry] of itemsByMenuItem.entries()) {
          for (const row of entry.rows) {
            const allocatedQty = allocationByRowId.get(row.id) ?? 0;
            if (allocatedQty > 0) {
              transactionItemsToInsert.push({
                transactionId: transactionRow.id,
                orderItemId: row.id,
                quantity: allocatedQty,
                menuItemId,
                nameSnapshot: row.name ?? "",
                unitPrice: toMoneyString(row.numericPrice),
              });
            }
          }
        }

        if (transactionItemsToInsert.length > 0) {
          await tx.insert(transactionItems).values(transactionItemsToInsert);
        }

        const batches = buildOrderBatches(remainingRows as OrderItemRow[], {
          omitFullyPaid: true,
        });

        return {
          order: {
            id: updatedOrder.id,
            tableId: updatedOrder.tableId,
            status: updatedOrder.status,
            subtotal: parseNumeric(updatedOrder.subtotal),
            discount: parseNumeric(updatedOrder.discount),
            total: parseNumeric(updatedOrder.total),
            totalAmount: parseNumeric(
              (updatedOrder as { totalAmount?: unknown }).totalAmount,
            ),
            paidAmount: parseNumeric(
              (updatedOrder as { paidAmount?: unknown }).paidAmount,
            ),
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
              date: normalizeTransactionDate(transactionRow.date),
              createdAt: transactionRow.createdAt.toISOString(),
            }
            : null,
          table: {
            id: table.id,
            number: table.number,
          },
          meta: {
            mode: "aa" as const,
            receivedAmount: Number(effectiveReceived.toFixed(2)),
            changeAmount: Number(changeAmount.toFixed(2)),
          },
        };
      }

      const { fullSubtotal, outstandingSubtotal } = calculateSubtotals(
        rows as OrderItemRow[],
      );

      const discountRate = discountPercent > 0 ? discountPercent / 100 : 0;
      const discountAmount = outstandingSubtotal * discountRate;
      const calculatedTotal = outstandingSubtotal - discountAmount;

      if (Math.abs(clientSubtotal - outstandingSubtotal) > epsilon) {
        return NextResponse.json(
          {
            error: "Client subtotal does not match server subtotal",
            code: "SUBTOTAL_MISMATCH",
            detail: {
              clientSubtotal,
              serverSubtotal: Number(outstandingSubtotal.toFixed(2)),
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

      const existingTotalAmount = parseNumeric(
        (order as { totalAmount?: unknown }).totalAmount ?? 0,
      );
      const existingPaidAmount = parseNumeric(
        (order as { paidAmount?: unknown }).paidAmount ?? 0,
      );

      const newTotalAmount =
        existingTotalAmount > 0 ? existingTotalAmount : fullSubtotal;
      const newPaidAmount = existingPaidAmount + calculatedTotal;

      // 整单结算：将所有菜品标记为已付（paidQuantity = quantity）
      const fullyPaidRows: OrderItemRow[] = [];
      for (const row of rows) {
        const qty = row.quantity;
        fullyPaidRows.push({ ...row, paidQuantity: qty });
        await tx
          .update(orderItems)
          .set({ paidQuantity: qty })
          .where(eq(orderItems.id, row.id));
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: "paid",
          subtotal: toMoneyString(fullSubtotal),
          discount: toMoneyString(discountAmount),
          total: toMoneyString(newPaidAmount),
          totalAmount: toMoneyString(newTotalAmount),
          paidAmount: toMoneyString(newPaidAmount),
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
          amount: toMoneyString(calculatedTotal),
          description: `POS 订单结账 - 桌台 ${table.number}`,
          paymentMethod,
          orderId: order.id,
        })
        .returning();

      // 写入交易明细行 (Full 模式：写入增量数量 = quantity - 原 paidQuantity)
      const fullTransactionItems: Array<{
        transactionId: string;
        orderItemId: string;
        quantity: number;
        menuItemId: string;
        nameSnapshot: string;
        unitPrice: string;
      }> = [];

      for (const row of rows) {
        const originalPaidQty = row.paidQuantity ?? 0;
        const incrementQty = row.quantity - originalPaidQty;
        if (incrementQty > 0) {
          fullTransactionItems.push({
            transactionId: transactionRow.id,
            orderItemId: row.id,
            quantity: incrementQty,
            menuItemId: row.menuItemId,
            nameSnapshot: row.name ?? "",
            unitPrice: String(row.price),
          });
        }
      }

      if (fullTransactionItems.length > 0) {
        await tx.insert(transactionItems).values(fullTransactionItems);
      }

      await tx
        .update(restaurantTables)
        .set({
          status: "idle",
          amount: "0",
          currentGuests: 0,
          startedAt: null,
        })
        .where(eq(restaurantTables.id, tableId));

      const batches = buildOrderBatches(fullyPaidRows, { omitFullyPaid: true });

      return {
        order: {
          id: updatedOrder.id,
          tableId: updatedOrder.tableId,
          status: updatedOrder.status,
          subtotal: parseNumeric(updatedOrder.subtotal),
          discount: parseNumeric(updatedOrder.discount),
          total: parseNumeric(updatedOrder.total),
          totalAmount: parseNumeric(
            (updatedOrder as { totalAmount?: unknown }).totalAmount,
          ),
          paidAmount: parseNumeric(
            (updatedOrder as { paidAmount?: unknown }).paidAmount,
          ),
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
            date: normalizeTransactionDate(transactionRow.date),
            createdAt: transactionRow.createdAt.toISOString(),
          }
          : null,
        table: {
          id: table.id,
          number: table.number,
        },
        meta: {
          mode: "full" as const,
          receivedAmount: Number(effectiveReceived.toFixed(2)),
          changeAmount: Number(changeAmount.toFixed(2)),
        },
      };
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("POST /api/orders/checkout error", err);
    return NextResponse.json(
      {
        error: "Failed to checkout order",
        detail: message,
      },
      { status: 500 },
    );
  }
}
