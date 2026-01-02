import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { format } from "date-fns"

import { getDb } from "@/lib/db"
import type { ReportGranularity } from "@/lib/reports/types"
import { getReports } from "@/services/reports"
import { reportExportQuerySchema } from "@/lib/contracts/reports"

export const runtime = "nodejs"

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

function buildFilenameBase(input: { granularity: ReportGranularity; startAtIso: string }) {
  const startAt = new Date(input.startAtIso)
  if (!Number.isFinite(startAt.getTime())) {
    return `reports-${input.granularity}`
  }

  switch (input.granularity) {
    case "day":
      return `reports-${format(startAt, "yyyy-MM-dd")}-day`
    case "week":
      return `reports-${format(startAt, "yyyy-MM-dd")}-week`
    case "month":
      return `reports-${format(startAt, "yyyy-MM")}-month`
    case "year":
      return `reports-${format(startAt, "yyyy")}-year`
  }
}

async function exportXlsx(payload: any) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "easyFactu"
  workbook.created = new Date()

  const summary = workbook.addWorksheet("Summary")
  summary.addRow(["Granularity", payload.range.granularity])
  summary.addRow(["Start At", payload.range.startAt])
  summary.addRow(["End At", payload.range.endAt])
  summary.addRow([])
  summary.addRow(["Gross Revenue", payload.kpis.grossRevenue])
  summary.addRow(["Orders Count", payload.kpis.ordersCount])
  summary.addRow(["Avg Order (Gross)", payload.kpis.averageOrderValueGross])
  summary.addRow([])
  summary.addRow(["Cash Amount", payload.kpis.cashAmount])
  summary.addRow(["Bank Amount", payload.kpis.bankAmount])
  summary.addRow(["Cash Ratio", payload.kpis.cashRatio])
  summary.addRow(["Bank Ratio", payload.kpis.bankRatio])

  const trend = workbook.addWorksheet("SalesTrend")
  trend.addRow(["Bucket", "Revenue"])
  for (const point of payload.salesTrend) {
    trend.addRow([point.bucket, point.revenue])
  }

  const topItems = workbook.addWorksheet("TopItems")
  topItems.addRow(["Rank", "Name", "Category", "Quantity Sold", "Revenue"])
  for (const [index, item] of (payload.topItems as any[]).entries()) {
    topItems.addRow([
      index + 1,
      item.name,
      item.category,
      item.quantitySold,
      item.revenueAmount,
    ])
  }

  for (const sheet of workbook.worksheets) {
    sheet.columns = sheet.columns.map((col) => ({
      ...col,
      width: Math.min(60, Math.max(12, (col.header?.toString().length ?? 12) + 6)),
    }))
  }

  const out = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer)
}

/**
 * GET /api/reports/export?format=xlsx&granularity=day|week|month|year
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const formatParam = url.searchParams.get("format") || undefined
  const granularityParam = url.searchParams.get("granularity") || undefined
  const queryParse = reportExportQuerySchema.safeParse({
    format: formatParam,
    granularity: granularityParam,
  })

  if (!queryParse.success) {
    return jsonError(400, "INVALID_QUERY", "Invalid query parameters", queryParse.error.flatten())
  }

  try {
    const db = getDb()
    const payload = await getReports(
      db,
      queryParse.data.granularity as ReportGranularity
    )

    const buffer = await exportXlsx(payload)
    const filenameBase = buildFilenameBase({
      granularity: queryParse.data.granularity as ReportGranularity,
      startAtIso: payload.range.startAt,
    })

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${filenameBase}.xlsx\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("GET /api/reports/export error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to export reports", message)
  }
}
