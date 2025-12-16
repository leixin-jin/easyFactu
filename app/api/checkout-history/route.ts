import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, like } from "drizzle-orm"
import { z } from "zod"

import { getDb } from "@/lib/db"
import { orders, restaurantTables, transactions } from "@/db/schema"
import { parseMoney } from "@/lib/money"

export const runtime = "nodejs"

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }
  return null
}

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

/**
 * GET /api/checkout-history?limit=50
 * - 返回最近 N 条 POS 结账交易（最新在前）
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limitParam = url.searchParams.get("limit") ?? undefined
  const queryParse = querySchema.safeParse({ limit: limitParam })

  if (!queryParse.success) {
    return jsonError(400, "INVALID_QUERY", "Invalid query parameters", queryParse.error.flatten())
  }

  try {
    const db = getDb()
    const rows = await db
      .select({
        transactionId: transactions.id,
        orderId: transactions.orderId,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
        tableNumber: restaurantTables.number,
      })
      .from(transactions)
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .where(and(eq(transactions.type, "income"), like(transactions.category, "POS checkout%")))
      .orderBy(desc(transactions.createdAt))
      .limit(queryParse.data.limit)

    const items = rows.map((row) => ({
      transactionId: row.transactionId,
      tableNumber: row.tableNumber ?? null,
      amount: parseMoney(row.amount),
      createdAt: toIsoString(row.createdAt) ?? "",
      orderId: row.orderId ?? null,
    }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("GET /api/checkout-history error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to load checkout history", message)
  }
}

