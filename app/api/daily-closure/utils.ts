import { and, eq, sql } from "drizzle-orm"

import {
  dailyClosureAdjustments,
  dailyClosureItemLines,
  dailyClosurePaymentLines,
  dailyClosures,
  menuItems,
  orderItems,
  orders,
  transactions,
} from "@/db/schema"
import { parseMoney } from "@/lib/money"
import {
  aggregateIncomeByPaymentMethod,
  buildDailyClosureItems,
  buildDailyClosurePayments,
  calculateDailyClosureOverview,
  type DailyClosureItemLine,
  type DailyClosureOverview,
  type DailyClosurePaymentLineInput,
  type DailyClosureItems,
} from "@/lib/daily-closure/calculate"

export const DEFAULT_DAILY_CLOSURE_TAX_RATE = 0.1

export function getTodayBusinessDate() {
  return new Date().toISOString().slice(0, 10)
}

export function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }
  return null
}

export function toBusinessDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "string") return value
  return String(value ?? "")
}

function safeNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export async function computeDailyClosureSnapshot(
  db: {
    select: (...args: any[]) => any
  },
  businessDate: string,
  taxRate: number,
): Promise<{
  overview: DailyClosureOverview
  paymentLines: DailyClosurePaymentLineInput[]
  items: DailyClosureItems
}> {
  const incomeRows = await db
    .select({
      paymentMethod: transactions.paymentMethod,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(and(eq(transactions.type, "income"), eq(transactions.date, businessDate)))

  const incomeTransactions: Array<{ paymentMethod: string; amount: number }> = incomeRows.map(
    (row: any) => ({
      paymentMethod: row.paymentMethod,
      amount: parseMoney(row.amount),
    }),
  )

  const paymentLines = aggregateIncomeByPaymentMethod(incomeTransactions)
  const grossRevenue = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)

  const [ordersCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.status, "paid"), sql`DATE(${orders.closedAt}) = ${businessDate}`))

  const ordersCount = Math.max(0, Math.trunc(safeNumber(ordersCountRow?.count)))

  const rawRows = await db
    .select({
      orderId: orders.id,
      orderDiscount: orders.discount,
      menuItemId: menuItems.id,
      name: menuItems.name,
      category: menuItems.category,
      quantity: orderItems.quantity,
      price: orderItems.price,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(and(eq(orders.status, "paid"), sql`DATE(${orders.closedAt}) = ${businessDate}`))

  const perOrder = new Map<
    string,
    {
      discountAmount: number
      items: Array<{
        menuItemId: string
        name: string
        category: string
        quantity: number
        subtotal: number
      }>
    }
  >()

  for (const row of rawRows as any[]) {
    const orderId = row.orderId as string
    const entry = perOrder.get(orderId) ?? {
      discountAmount: parseMoney(row.orderDiscount),
      items: [],
    }

    const quantity = Math.max(0, Math.trunc(row.quantity ?? 0))
    const price = parseMoney(row.price)
    const subtotal = price * quantity

    entry.items.push({
      menuItemId: row.menuItemId,
      name: row.name,
      category: row.category,
      quantity,
      subtotal,
    })

    perOrder.set(orderId, entry)
  }

  const totals = new Map<
    string,
    {
      menuItemId: string
      name: string
      category: string
      quantitySold: number
      revenueAmount: number
      discountImpactAmount: number
    }
  >()

  for (const order of perOrder.values()) {
    const orderSubtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0)
    const discountAmount = orderSubtotal > 0 ? order.discountAmount : 0

    for (const item of order.items) {
      const ratio = orderSubtotal > 0 ? item.subtotal / orderSubtotal : 0
      const allocatedDiscount = discountAmount * ratio
      const revenue = item.subtotal - allocatedDiscount

      const existing = totals.get(item.menuItemId) ?? {
        menuItemId: item.menuItemId,
        name: item.name,
        category: item.category,
        quantitySold: 0,
        revenueAmount: 0,
        discountImpactAmount: 0,
      }

      existing.quantitySold += item.quantity
      existing.revenueAmount += revenue
      existing.discountImpactAmount += allocatedDiscount
      totals.set(item.menuItemId, existing)
    }
  }

  const items = buildDailyClosureItems(
    Array.from(totals.values()).map((line) => ({
      menuItemId: line.menuItemId,
      name: line.name,
      category: line.category,
      quantitySold: line.quantitySold,
      revenueAmount: line.revenueAmount,
      discountImpactAmount: line.discountImpactAmount,
    })),
  )

  const overview = calculateDailyClosureOverview({
    grossRevenue,
    ordersCount,
    taxRate,
    refundAmount: 0,
    voidAmount: 0,
  })

  return {
    overview,
    paymentLines,
    items,
  }
}

export async function loadLockedDailyClosureByBusinessDate(
  db: {
    select: (...args: any[]) => any
  },
  businessDate: string,
) {
  const [closure] = await db
    .select()
    .from(dailyClosures)
    .where(eq(dailyClosures.businessDate, businessDate))
    .limit(1)

  if (!closure) return null

  const paymentLines = await db
    .select()
    .from(dailyClosurePaymentLines)
    .where(eq(dailyClosurePaymentLines.closureId, closure.id))

  const adjustments = await db
    .select()
    .from(dailyClosureAdjustments)
    .where(eq(dailyClosureAdjustments.closureId, closure.id))
    .orderBy(dailyClosureAdjustments.createdAt)

  const itemLines = await db
    .select()
    .from(dailyClosureItemLines)
    .where(eq(dailyClosureItemLines.closureId, closure.id))

  return {
    closure,
    paymentLines,
    adjustments,
    itemLines,
  }
}

export async function loadLockedDailyClosureById(
  db: {
    select: (...args: any[]) => any
  },
  id: string,
) {
  const [closure] = await db
    .select()
    .from(dailyClosures)
    .where(eq(dailyClosures.id, id))
    .limit(1)

  if (!closure) return null

  const paymentLines = await db
    .select()
    .from(dailyClosurePaymentLines)
    .where(eq(dailyClosurePaymentLines.closureId, closure.id))

  const adjustments = await db
    .select()
    .from(dailyClosureAdjustments)
    .where(eq(dailyClosureAdjustments.closureId, closure.id))
    .orderBy(dailyClosureAdjustments.createdAt)

  const itemLines = await db
    .select()
    .from(dailyClosureItemLines)
    .where(eq(dailyClosureItemLines.closureId, closure.id))

  return {
    closure,
    paymentLines,
    adjustments,
    itemLines,
  }
}

export function buildDailyClosureResponseFromLockedData(input: {
  closure: any
  paymentLines: any[]
  adjustments: any[]
  itemLines: any[]
}) {
  const { closure, paymentLines: paymentLineRows, adjustments, itemLines } = input

  const businessDate = toBusinessDateString(closure.businessDate)
  const taxRate = parseMoney(closure.taxRate)
  const overview = calculateDailyClosureOverview({
    grossRevenue: parseMoney(closure.grossRevenue),
    ordersCount: closure.ordersCount ?? 0,
    taxRate,
    refundAmount: parseMoney(closure.refundAmount),
    voidAmount: parseMoney(closure.voidAmount),
  })

  const normalizedPaymentLines: DailyClosurePaymentLineInput[] = paymentLineRows.map(
    (line) => ({
      paymentMethod: line.paymentMethod,
      paymentGroup: line.paymentGroup,
      expectedAmount: parseMoney(line.expectedAmount),
    }),
  )

  const payments = buildDailyClosurePayments(
    normalizedPaymentLines,
    adjustments.map((row) => ({
      amount: parseMoney(row.amount),
      paymentMethod: row.paymentMethod ?? null,
    })),
  )

  const normalizedItemLines: DailyClosureItemLine[] = itemLines.map((row) => ({
    menuItemId: row.menuItemId ?? null,
    name: row.nameSnapshot,
    category: row.categorySnapshot,
    quantitySold: row.quantitySold,
    revenueAmount: parseMoney(row.revenueAmount),
    discountImpactAmount:
      row.discountImpactAmount == null ? null : parseMoney(row.discountImpactAmount),
  }))

  return {
    businessDate,
    taxRate,
    locked: Boolean(closure.lockedAt),
    closureId: closure.id,
    lockedAt: toIsoString(closure.lockedAt),
    overview,
    payments,
    items: buildDailyClosureItems(normalizedItemLines),
    adjustments: adjustments.map((row) => ({
      id: row.id,
      type: row.type,
      amount: parseMoney(row.amount),
      note: row.note,
      paymentMethod: row.paymentMethod ?? null,
      createdAt: toIsoString(row.createdAt) ?? "",
    })),
    meta: {
      refundVoidPolicy:
        "当前系统未实现退款/作废流水统计口径，接口固定返回 0（后续可通过 transactions 扩展）。",
    },
  }
}
