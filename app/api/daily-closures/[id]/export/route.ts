import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { PDFDocument, StandardFonts } from "pdf-lib"

import { getDb } from "@/lib/db"
import { formatMoney } from "@/lib/money"
import { getClosureDetails } from "@/services/daily-closures"
import { closureExportQuerySchema } from "@/lib/contracts/daily-closures"
import { uuidParamSchema } from "@/lib/contracts/common"
import { NotFoundError } from "@/lib/http/errors"

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

function formatEuro(value: number) {
  return `€${formatMoney(value)}`
}

async function exportXlsx(payload: any) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "easyFactu"
  workbook.created = new Date()

  const summary = workbook.addWorksheet("Summary")
  summary.addRow(["Business Date", payload.businessDate])
  summary.addRow(["Closure ID", payload.closureId])
  summary.addRow(["Locked At", payload.lockedAt ?? ""])
  summary.addRow(["Tax Rate", payload.taxRate])
  summary.addRow([])
  summary.addRow(["Gross Revenue", payload.overview.grossRevenue])
  summary.addRow(["Net Revenue", payload.overview.netRevenue])
  summary.addRow(["Orders Count", payload.overview.ordersCount])
  summary.addRow(["Avg Order (Gross)", payload.overview.averageOrderValueGross])
  summary.addRow(["Avg Order (Net)", payload.overview.averageOrderValueNet])
  summary.addRow(["Refund Amount", payload.overview.refundAmount])
  summary.addRow(["Void Amount", payload.overview.voidAmount])

  const payments = workbook.addWorksheet("Payments")
  payments.addRow([
    "Payment Method",
    "Group",
    "Expected",
    "Adjustments",
    "Actual",
  ])
  for (const line of payload.payments.lines) {
    payments.addRow([
      line.paymentMethod,
      line.paymentGroup,
      line.expectedAmount,
      line.adjustmentsAmount,
      line.actualAmount,
    ])
  }
  payments.addRow([])
  payments.addRow(["Expected Total", "", payload.payments.expectedTotal])
  payments.addRow(["Actual Total", "", payload.payments.actualTotal])
  payments.addRow(["Difference", "", payload.payments.difference])

  const items = workbook.addWorksheet("Items")
  items.addRow([
    "Name",
    "Category",
    "Quantity Sold",
    "Revenue",
    "Avg Price",
    "Discount Impact",
  ])
  for (const line of payload.items.lines) {
    const avgPrice = line.quantitySold > 0 ? line.revenueAmount / line.quantitySold : 0
    items.addRow([
      line.name,
      line.category,
      line.quantitySold,
      line.revenueAmount,
      avgPrice,
      line.discountImpactAmount ?? 0,
    ])
  }

  const adjustments = workbook.addWorksheet("Adjustments")
  adjustments.addRow([
    "Created At",
    "Type",
    "Amount",
    "Payment Method",
    "Note",
  ])
  for (const adj of payload.adjustments) {
    adjustments.addRow([
      adj.createdAt,
      adj.type,
      adj.amount,
      adj.paymentMethod ?? "",
      adj.note,
    ])
  }

  for (const sheet of workbook.worksheets) {
    sheet.columns = sheet.columns.map((col) => ({
      ...col,
      width: Math.min(50, Math.max(12, (col.header?.toString().length ?? 12) + 4)),
    }))
  }

  const out = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer)
}

async function exportPdf(payload: any) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 10
  const lineHeight = fontSize + 4
  const margin = 40

  const lines: string[] = []
  lines.push(`Daily Closure (${payload.businessDate})`)
  lines.push(`Closure ID: ${payload.closureId}`)
  lines.push(`Locked At: ${payload.lockedAt ?? ""}`)
  lines.push("")
  lines.push(`Gross Revenue: ${formatEuro(payload.overview.grossRevenue)}`)
  lines.push(`Net Revenue: ${formatEuro(payload.overview.netRevenue)}`)
  lines.push(`Orders Count: ${payload.overview.ordersCount}`)
  lines.push(`Avg Order (Gross): ${formatEuro(payload.overview.averageOrderValueGross)}`)
  lines.push(`Avg Order (Net): ${formatEuro(payload.overview.averageOrderValueNet)}`)
  lines.push(`Refund Amount: ${formatEuro(payload.overview.refundAmount)}`)
  lines.push(`Void Amount: ${formatEuro(payload.overview.voidAmount)}`)
  lines.push("")
  lines.push("Payments")
  for (const line of payload.payments.lines) {
    lines.push(
      `- ${line.paymentMethod} (${line.paymentGroup}) expected ${formatEuro(line.expectedAmount)} adj ${formatEuro(line.adjustmentsAmount)} actual ${formatEuro(line.actualAmount)}`,
    )
  }
  lines.push(`Expected Total: ${formatEuro(payload.payments.expectedTotal)}`)
  lines.push(`Actual Total: ${formatEuro(payload.payments.actualTotal)}`)
  lines.push(`Difference: ${formatEuro(payload.payments.difference)}`)
  lines.push("")
  lines.push("Adjustments")
  if (payload.adjustments.length === 0) {
    lines.push("- (none)")
  } else {
    for (const adj of payload.adjustments) {
      lines.push(
        `- ${adj.createdAt} ${adj.type} ${formatEuro(adj.amount)} ${adj.paymentMethod ?? ""} ${adj.note}`,
      )
    }
  }
  lines.push("")
  lines.push("Items")
  for (const item of payload.items.lines) {
    const avg = item.quantitySold > 0 ? item.revenueAmount / item.quantitySold : 0
    lines.push(
      `- ${item.name} [${item.category}] qty ${item.quantitySold} revenue ${formatEuro(item.revenueAmount)} avg ${formatEuro(avg)}`,
    )
  }

  let page = pdfDoc.addPage()
  let { height } = page.getSize()
  let cursorY = height - margin

  for (const text of lines) {
    if (cursorY < margin) {
      page = pdfDoc.addPage()
      height = page.getSize().height
      cursorY = height - margin
    }
    page.drawText(text, {
      x: margin,
      y: cursorY,
      size: fontSize,
      font,
    })
    cursorY -= lineHeight
  }

  return Buffer.from(await pdfDoc.save())
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  const idParse = uuidParamSchema.safeParse({ id })
  if (!idParse.success) {
    return jsonError(400, "INVALID_ID", "Invalid daily closure id")
  }

  const url = new URL(req.url)
  const formatParam = url.searchParams.get("format") || undefined
  const queryParse = closureExportQuerySchema.safeParse({ format: formatParam })

  if (!queryParse.success) {
    return jsonError(400, "INVALID_QUERY", "Invalid query parameters", queryParse.error.flatten())
  }

  try {
    const db = getDb()
    const payload = await getClosureDetails(db, id)
    if (!payload.locked) {
      return jsonError(409, "NOT_LOCKED", "Daily closure is not locked yet")
    }

    const format = queryParse.data.format
    const filenameBase = `daily-closure-${payload.businessDate}`

    if (format === "xlsx") {
      const buffer = await exportXlsx(payload)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=\"${filenameBase}.xlsx\"`,
          "Cache-Control": "no-store",
        },
      })
    }

    const buffer = await exportPdf(payload)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filenameBase}.pdf\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      return jsonError(404, "NOT_FOUND", "Daily closure not found")
    }

    const message = err instanceof Error ? err.message : String(err)
    console.error("GET /api/daily-closures/[id]/export error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to export daily closure", message)
  }
}
