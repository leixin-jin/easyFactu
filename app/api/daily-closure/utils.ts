import { and, desc, eq, gte, lt, sql } from "drizzle-orm"

import {
  dailyClosureAdjustments,
  dailyClosureItemLines,
  dailyClosurePaymentLines,
  dailyClosures,
  dailyClosureState,
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

export function toIsoString(value: Date): string
export function toIsoString(value: string): string
export function toIsoString(value: unknown): string | null
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

/**
 * 按时间区间 [periodStartAt, periodEndAt) 计算日结快照
 * 收入/支付聚合：基于 transactions.createdAt
 * 订单/菜品明细：基于 orders.closedAt
 */
export async function computeClosureSnapshotByRange(
  db: {
    select: (...args: any[]) => any
  },
  periodStartAt: Date,
  periodEndAt: Date,
  taxRate: number,
): Promise<{
  overview: DailyClosureOverview
  paymentLines: DailyClosurePaymentLineInput[]
  items: DailyClosureItems
}> {
  // 按时间区间筛选收入交易
  const incomeRows = await db
    .select({
      paymentMethod: transactions.paymentMethod,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "income"),
        gte(transactions.createdAt, periodStartAt),
        lt(transactions.createdAt, periodEndAt)
      )
    )

  const incomeTransactions: Array<{ paymentMethod: string; amount: number }> = incomeRows.map(
    (row: any) => ({
      paymentMethod: row.paymentMethod,
      amount: parseMoney(row.amount),
    }),
  )

  const paymentLines = aggregateIncomeByPaymentMethod(incomeTransactions)
  const grossRevenue = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)

  // 按时间区间统计订单数
  const [ordersCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(
      and(
        eq(orders.status, "paid"),
        gte(orders.closedAt, periodStartAt),
        lt(orders.closedAt, periodEndAt)
      )
    )

  const ordersCount = Math.max(0, Math.trunc(safeNumber(ordersCountRow?.count)))

  // 按时间区间查询订单菜品明细
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
    .where(
      and(
        eq(orders.status, "paid"),
        gte(orders.closedAt, periodStartAt),
        lt(orders.closedAt, periodEndAt)
      )
    )

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

/**
 * 获取或初始化日结状态
 */
export async function getOrInitDailyClosureState(
  db: {
    select: (...args: any[]) => any
    insert: (...args: any[]) => any
  },
): Promise<{ currentPeriodStartAt: Date; nextSequenceNo: number }> {
  const [state] = await db
    .select()
    .from(dailyClosureState)
    .where(eq(dailyClosureState.id, 1))
    .limit(1)

  if (state) {
    return {
      currentPeriodStartAt: state.currentPeriodStartAt,
      nextSequenceNo: state.nextSequenceNo,
    }
  }

  const now = new Date()
  const [lastClosure] = await db
    .select({
      periodEndAt: dailyClosures.periodEndAt,
      sequenceNo: dailyClosures.sequenceNo,
    })
    .from(dailyClosures)
    .orderBy(desc(dailyClosures.sequenceNo))
    .limit(1)

  // 初始化状态：从“上一份报告结束时间”开始；若没有历史报告，则从 now 开始
  const currentPeriodStartAt = lastClosure?.periodEndAt ?? now
  const nextSequenceNo = (lastClosure?.sequenceNo ?? 0) + 1

  await db
    .insert(dailyClosureState)
    .values({
      id: 1,
      currentPeriodStartAt,
      nextSequenceNo,
      updatedAt: now,
    })
    .onConflictDoNothing()

  return {
    currentPeriodStartAt,
    nextSequenceNo,
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
