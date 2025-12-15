import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getDb } from "@/lib/db"
import { toMoneyString } from "@/lib/money"
import {
  dailyClosureAdjustments,
  dailyClosureItemLines,
  dailyClosurePaymentLines,
  dailyClosures,
} from "@/db/schema"
import {
  buildDailyClosureResponseFromLockedData,
  computeDailyClosureSnapshot,
  DEFAULT_DAILY_CLOSURE_TAX_RATE,
  getTodayBusinessDate,
  loadLockedDailyClosureByBusinessDate,
  loadLockedDailyClosureById,
} from "@/app/api/daily-closure/utils"

const bodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  taxRate: z.number().finite().min(0).max(1).optional(),
  adjustments: z
    .array(
      z.object({
        type: z.enum(["fee", "rounding", "other"]),
        amount: z.number().finite(),
        note: z.string().min(1),
        paymentMethod: z.string().min(1).optional().nullable(),
      }),
    )
    .optional(),
})

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}))
  const parseResult = bodySchema.safeParse(json)

  if (!parseResult.success) {
    return jsonError(400, "INVALID_BODY", "Invalid request body", parseResult.error.flatten())
  }

  const businessDate = parseResult.data.date ?? getTodayBusinessDate()
  const taxRate = parseResult.data.taxRate ?? DEFAULT_DAILY_CLOSURE_TAX_RATE
  const initialAdjustments = parseResult.data.adjustments ?? []

  try {
    const db = getDb()

    const result = await db.transaction(async (tx) => {
      const existing = await loadLockedDailyClosureByBusinessDate(tx as any, businessDate)
      if (existing) {
        return buildDailyClosureResponseFromLockedData(existing)
      }

      const snapshot = await computeDailyClosureSnapshot(tx as any, businessDate, taxRate)
      const lockedAt = new Date()

      const [closure] = await tx
        .insert(dailyClosures)
        .values({
          businessDate,
          taxRate: taxRate.toFixed(4),
          grossRevenue: toMoneyString(snapshot.overview.grossRevenue),
          netRevenue: toMoneyString(snapshot.overview.netRevenue),
          ordersCount: snapshot.overview.ordersCount,
          refundAmount: toMoneyString(snapshot.overview.refundAmount),
          voidAmount: toMoneyString(snapshot.overview.voidAmount),
          lockedAt,
        })
        .returning()

      if (!closure) {
        return jsonError(500, "INSERT_FAILED", "Failed to create daily closure")
      }

      if (snapshot.paymentLines.length > 0) {
        await tx.insert(dailyClosurePaymentLines).values(
          snapshot.paymentLines.map((line) => ({
            closureId: closure.id,
            paymentMethod: line.paymentMethod,
            paymentGroup: line.paymentGroup,
            expectedAmount: toMoneyString(line.expectedAmount),
          })),
        )
      }

      if (snapshot.items.lines.length > 0) {
        await tx.insert(dailyClosureItemLines).values(
          snapshot.items.lines.map((line) => ({
            closureId: closure.id,
            menuItemId: line.menuItemId,
            nameSnapshot: line.name,
            categorySnapshot: line.category,
            quantitySold: line.quantitySold,
            revenueAmount: toMoneyString(line.revenueAmount),
            discountImpactAmount:
              line.discountImpactAmount == null
                ? null
                : toMoneyString(line.discountImpactAmount),
          })),
        )
      }

      if (initialAdjustments.length > 0) {
        await tx.insert(dailyClosureAdjustments).values(
          initialAdjustments.map((adj) => ({
            closureId: closure.id,
            type: adj.type,
            amount: toMoneyString(adj.amount),
            note: adj.note,
            paymentMethod: adj.paymentMethod ?? null,
          })),
        )
      }

      const locked = await loadLockedDailyClosureById(tx as any, closure.id)
      if (!locked) {
        return jsonError(500, "LOAD_FAILED", "Failed to load created daily closure")
      }

      return buildDailyClosureResponseFromLockedData(locked)
    })

    if (result instanceof NextResponse) {
      return result
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const errorCode =
      typeof err === "object" && err && "code" in err ? (err as { code?: unknown }).code : undefined

    if (typeof errorCode === "string" && errorCode === "23505") {
      try {
        const db = getDb()
        const existing = await loadLockedDailyClosureByBusinessDate(db as any, businessDate)
        if (existing) {
          return NextResponse.json(buildDailyClosureResponseFromLockedData(existing))
        }
      } catch (loadErr) {
        console.error("POST /api/daily-closures/confirm load-after-unique error", loadErr)
      }
      return jsonError(409, "ALREADY_LOCKED", "Daily closure already exists for this date", businessDate)
    }

    console.error("POST /api/daily-closures/confirm error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to confirm daily closure", message)
  }
}
