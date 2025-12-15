import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getDb } from "@/lib/db"
import {
  buildDailyClosureResponseFromLockedData,
  computeDailyClosureSnapshot,
  DEFAULT_DAILY_CLOSURE_TAX_RATE,
  getTodayBusinessDate,
  loadLockedDailyClosureByBusinessDate,
} from "@/app/api/daily-closure/utils"
import { buildDailyClosurePayments } from "@/lib/daily-closure/calculate"

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
})

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const dateParam = url.searchParams.get("date") || undefined
  const queryParse = querySchema.safeParse({ date: dateParam })

  if (!queryParse.success) {
    return jsonError(400, "INVALID_QUERY", "Invalid query parameters", queryParse.error.flatten())
  }

  const businessDate = queryParse.data.date ?? getTodayBusinessDate()

  try {
    const db = getDb()

    const lockedData = await loadLockedDailyClosureByBusinessDate(db as any, businessDate)
    if (!lockedData) {
      const taxRate = DEFAULT_DAILY_CLOSURE_TAX_RATE
      const snapshot = await computeDailyClosureSnapshot(db as any, businessDate, taxRate)

      return NextResponse.json({
        businessDate,
        taxRate,
        locked: false,
        closureId: null,
        lockedAt: null,
        overview: snapshot.overview,
        payments: buildDailyClosurePayments(snapshot.paymentLines, []),
        items: snapshot.items,
        adjustments: [],
        meta: {
          refundVoidPolicy:
            "当前系统未实现退款/作废流水统计口径，接口固定返回 0（后续可通过 transactions 扩展）。",
        },
      })
    }

    return NextResponse.json(buildDailyClosureResponseFromLockedData(lockedData))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("GET /api/daily-closure error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to load daily closure", message)
  }
}
