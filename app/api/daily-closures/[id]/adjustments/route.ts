import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { getDb } from "@/lib/db"
import { parseMoney, toMoneyString } from "@/lib/money"
import { dailyClosureAdjustments, dailyClosures } from "@/db/schema"
import { toIsoString } from "@/app/api/daily-closure/utils"

const bodySchema = z.object({
  type: z.enum(["fee", "rounding", "other"]),
  amount: z.number().finite(),
  note: z.string().min(1),
  paymentMethod: z.string().min(1).optional().nullable(),
})

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  const idParse = z.string().uuid().safeParse(id)
  if (!idParse.success) {
    return jsonError(400, "INVALID_ID", "Invalid daily closure id")
  }

  const json = await req.json().catch(() => ({}))
  const parseResult = bodySchema.safeParse(json)

  if (!parseResult.success) {
    return jsonError(400, "INVALID_BODY", "Invalid request body", parseResult.error.flatten())
  }

  try {
    const db = getDb()

    const [closure] = await db
      .select({ id: dailyClosures.id })
      .from(dailyClosures)
      .where(eq(dailyClosures.id, id))
      .limit(1)

    if (!closure) {
      return jsonError(404, "NOT_FOUND", "Daily closure not found")
    }

    await db.insert(dailyClosureAdjustments).values({
      closureId: id,
      type: parseResult.data.type,
      amount: toMoneyString(parseResult.data.amount),
      note: parseResult.data.note,
      paymentMethod: parseResult.data.paymentMethod ?? null,
    })

    const rows = await db
      .select()
      .from(dailyClosureAdjustments)
      .where(eq(dailyClosureAdjustments.closureId, id))
      .orderBy(dailyClosureAdjustments.createdAt)

    return NextResponse.json({
      adjustments: rows.map((row) => ({
        id: row.id,
        type: row.type,
        amount: parseMoney(row.amount),
        note: row.note,
        paymentMethod: row.paymentMethod ?? null,
        createdAt: toIsoString(row.createdAt) ?? "",
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("POST /api/daily-closures/[id]/adjustments error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to create adjustment", message)
  }
}

