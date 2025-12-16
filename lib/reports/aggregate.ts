import { and, eq, gte, lt, sql } from "drizzle-orm"

import { menuItems, orderItems, orders, transactions } from "@/db/schema"
import { parseMoney } from "@/lib/money"
import {
  aggregateIncomeByPaymentMethod,
  buildDailyClosureItems,
  buildDailyClosurePayments,
  calculateDailyClosureOverview,
} from "@/lib/daily-closure/calculate"

import type { ReportGranularity, ReportsPayload } from "./types"
import { getReportRange } from "./time"
import { buildTrendBucketStarts, fillTrendSeries, getTrendBucketUnit } from "./trend"

const DEFAULT_TAX_RATE = 0.1
const DEFAULT_TOP_ITEMS_LIMIT = 10

function safeNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") return parseMoney(value)
  return 0
}

function ratio(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.min(1, part / total))
}

function trendDateTrunc(unit: "hour" | "day" | "month") {
  return unit
}

export async function buildReportsPayload(input: {
  db: {
    select: (...args: any[]) => any
  }
  granularity: ReportGranularity
  now?: Date
}): Promise<ReportsPayload> {
  const { db, granularity } = input
  const now = input.now ?? new Date()

  const { startAt, endAt } = getReportRange(granularity, now)

  const incomeRows = await db
    .select({
      paymentMethod: transactions.paymentMethod,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "income"),
        gte(transactions.createdAt, startAt),
        lt(transactions.createdAt, endAt),
      ),
    )

  const incomeTransactions = incomeRows.map((row: any) => ({
    paymentMethod: row.paymentMethod,
    amount: parseMoney(row.amount),
  }))

  const paymentLines = aggregateIncomeByPaymentMethod(incomeTransactions)
  const payments = buildDailyClosurePayments(paymentLines, [])

  const grossRevenue = incomeTransactions.reduce((sum, t) => sum + safeNumber(t.amount), 0)

  const [ordersCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(
      and(
        eq(orders.status, "paid"),
        gte(orders.closedAt, startAt),
        lt(orders.closedAt, endAt),
      ),
    )

  const ordersCount = Math.max(0, Math.trunc(safeNumber(ordersCountRow?.count)))

  const overview = calculateDailyClosureOverview({
    grossRevenue,
    ordersCount,
    taxRate: DEFAULT_TAX_RATE,
    refundAmount: 0,
    voidAmount: 0,
  })

  const rawItemRows = await db
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
        gte(orders.closedAt, startAt),
        lt(orders.closedAt, endAt),
      ),
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

  for (const row of rawItemRows as any[]) {
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
      const itemSubtotal = safeNumber(item.subtotal)
      const ratio = orderSubtotal > 0 ? itemSubtotal / orderSubtotal : 0
      const allocatedDiscount = discountAmount * ratio
      const revenue = itemSubtotal - allocatedDiscount

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

  const topItems = items.lines.slice(0, DEFAULT_TOP_ITEMS_LIMIT).map((line) => ({
    menuItemId: line.menuItemId,
    name: line.name,
    category: line.category,
    quantitySold: line.quantitySold,
    revenueAmount: line.revenueAmount,
  }))

  const bucketUnit = getTrendBucketUnit(granularity)
  const dateTrunc = trendDateTrunc(bucketUnit)
  const dateTruncLiteral = sql.raw(`'${dateTrunc}'`)

  const rawTrendRows = await db
    .select({
      bucket: sql<Date>`date_trunc(${dateTruncLiteral}, ${transactions.createdAt})`.as("bucket"),
      revenue: sql<string>`sum(${transactions.amount})`.as("revenue"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "income"),
        gte(transactions.createdAt, startAt),
        lt(transactions.createdAt, endAt),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`)

  const trendRows = rawTrendRows
    .map((row: any) => ({
      bucket: row.bucket instanceof Date ? row.bucket : new Date(row.bucket),
      revenue: parseMoney(row.revenue),
    }))
    .filter((row) => Number.isFinite(row.bucket.getTime()))

  const buckets = buildTrendBucketStarts({ startAt, endAt, granularity })
  const salesTrend = fillTrendSeries(buckets, trendRows)

  const cashAmount = payments.cashExpectedTotal
  const bankAmount = payments.nonCashExpectedTotal
  const cashRatio = ratio(cashAmount, payments.expectedTotal)
  const bankRatio = ratio(bankAmount, payments.expectedTotal)

  return {
    range: {
      granularity,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    },
    kpis: {
      grossRevenue: overview.grossRevenue,
      ordersCount: overview.ordersCount,
      averageOrderValueGross: overview.averageOrderValueGross,
      cashAmount,
      bankAmount,
      cashRatio,
      bankRatio,
    },
    salesTrend,
    topItems,
  }
}
