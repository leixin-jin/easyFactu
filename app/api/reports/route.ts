import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getDb } from "@/lib/db"
import { buildReportsPayload } from "@/lib/reports/aggregate"
import type { ReportGranularity } from "@/lib/reports/types"

export const runtime = "nodejs"

const querySchema = z.object({
  granularity: z.enum(["day", "week", "month", "year"]).optional().default("month"),
})

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

/**
 * GET /api/reports?granularity=day|week|month|year
 * - 统计区间：由服务器按当前时间计算，口径为 [startAt, endAt)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const granularityParam = url.searchParams.get("granularity") || undefined
  const queryParse = querySchema.safeParse({ granularity: granularityParam })

  if (!queryParse.success) {
    return jsonError(400, "INVALID_QUERY", "Invalid query parameters", queryParse.error.flatten())
  }

  try {
    const db = getDb()
    const payload = await buildReportsPayload({
      db: db as any,
      granularity: queryParse.data.granularity as ReportGranularity,
    })
    return NextResponse.json(payload)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("GET /api/reports error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to load reports", message)
  }
}

