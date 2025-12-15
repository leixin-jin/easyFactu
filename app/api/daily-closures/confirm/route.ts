import { NextRequest, NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"

import { getDb } from "@/lib/db"
import { toMoneyString } from "@/lib/money"
import {
  dailyClosureAdjustments,
  dailyClosureItemLines,
  dailyClosurePaymentLines,
  dailyClosures,
  dailyClosureState,
} from "@/db/schema"
import {
  computeClosureSnapshotByRange,
  DEFAULT_DAILY_CLOSURE_TAX_RATE,
  toIsoString,
} from "@/app/api/daily-closure/utils"
import { buildDailyClosurePayments, calculateDailyClosureOverview } from "@/lib/daily-closure/calculate"
import { parseMoney } from "@/lib/money"

const bodySchema = z.object({
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
  idempotencyKey: z.string().optional(), // 幂等键（可选）
})

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

/**
 * POST /api/daily-closures/confirm
 * 生成一份新的日结报告并推进统计区间
 * - 事务内锁定 daily_closure_state 防止并发
 * - 生成报告写入 daily_closures + line tables
 * - 更新 state: current_period_start_at = now, next_sequence_no++
 */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}))
  const parseResult = bodySchema.safeParse(json)

  if (!parseResult.success) {
    return jsonError(400, "INVALID_BODY", "Invalid request body", parseResult.error.flatten())
  }

  const taxRate = parseResult.data.taxRate ?? DEFAULT_DAILY_CLOSURE_TAX_RATE
  const initialAdjustments = parseResult.data.adjustments ?? []

  try {
    const db = getDb()

    const result = await db.transaction(async (tx) => {
      // 锁定 daily_closure_state 行（SELECT FOR UPDATE）
      const [state] = await tx
        .select()
        .from(dailyClosureState)
        .where(eq(dailyClosureState.id, 1))
        .for("update")

      let periodStartAt: Date
      let sequenceNo: number

      if (!state) {
        // 首次使用，初始化状态
        periodStartAt = new Date()
        sequenceNo = 1
        await tx.insert(dailyClosureState).values({
          id: 1,
          currentPeriodStartAt: periodStartAt,
          nextSequenceNo: 2,
        })
      } else {
        periodStartAt = state.currentPeriodStartAt
        sequenceNo = state.nextSequenceNo
      }

      const periodEndAt = new Date()
      const businessDate = periodEndAt.toISOString().slice(0, 10)

      // 计算当前区间的快照
      const snapshot = await computeClosureSnapshotByRange(
        tx as any,
        periodStartAt,
        periodEndAt,
        taxRate
      )

      // 写入日结报告
      const [closure] = await tx
        .insert(dailyClosures)
        .values({
          businessDate,
          sequenceNo,
          periodStartAt,
          periodEndAt,
          taxRate: taxRate.toFixed(4),
          grossRevenue: toMoneyString(snapshot.overview.grossRevenue),
          netRevenue: toMoneyString(snapshot.overview.netRevenue),
          ordersCount: snapshot.overview.ordersCount,
          refundAmount: toMoneyString(snapshot.overview.refundAmount),
          voidAmount: toMoneyString(snapshot.overview.voidAmount),
          lockedAt: periodEndAt,
        })
        .returning()

      if (!closure) {
        throw new Error("Failed to create daily closure record")
      }

      // 写入支付方式明细
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

      // 写入菜品明细
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

      // 写入初始差额调整
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

      // 推进 state：下一个区间的起点 = 本次的终点
      if (state) {
        await tx
          .update(dailyClosureState)
          .set({
            currentPeriodStartAt: periodEndAt,
            nextSequenceNo: sequenceNo + 1,
            updatedAt: periodEndAt,
          })
          .where(eq(dailyClosureState.id, 1))
      }

      // 查询完整数据返回
      const paymentLines = await tx
        .select()
        .from(dailyClosurePaymentLines)
        .where(eq(dailyClosurePaymentLines.closureId, closure.id))

      const adjustments = await tx
        .select()
        .from(dailyClosureAdjustments)
        .where(eq(dailyClosureAdjustments.closureId, closure.id))
        .orderBy(dailyClosureAdjustments.createdAt)

      const itemLines = await tx
        .select()
        .from(dailyClosureItemLines)
        .where(eq(dailyClosureItemLines.closureId, closure.id))

      // 构建响应
      const overview = calculateDailyClosureOverview({
        grossRevenue: parseMoney(closure.grossRevenue),
        ordersCount: closure.ordersCount,
        taxRate: parseMoney(closure.taxRate),
        refundAmount: parseMoney(closure.refundAmount),
        voidAmount: parseMoney(closure.voidAmount),
      })

      const payments = buildDailyClosurePayments(
        paymentLines.map((line) => ({
          paymentMethod: line.paymentMethod,
          paymentGroup: line.paymentGroup,
          expectedAmount: parseMoney(line.expectedAmount),
        })),
        adjustments.map((row) => ({
          amount: parseMoney(row.amount),
          paymentMethod: row.paymentMethod ?? null,
        })),
      )

      return {
        periodStartAt: toIsoString(closure.periodStartAt),
        periodEndAt: toIsoString(closure.periodEndAt),
        sequenceNo: closure.sequenceNo,
        taxRate: parseMoney(closure.taxRate),
        locked: true,
        closureId: closure.id,
        lockedAt: toIsoString(closure.lockedAt),
        overview,
        payments,
        items: {
          categories: snapshot.items.categories,
          lines: itemLines.map((row) => ({
            menuItemId: row.menuItemId ?? null,
            name: row.nameSnapshot,
            category: row.categorySnapshot,
            quantitySold: row.quantitySold,
            revenueAmount: parseMoney(row.revenueAmount),
            discountImpactAmount:
              row.discountImpactAmount == null ? null : parseMoney(row.discountImpactAmount),
          })),
        },
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
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const errorCode =
      typeof err === "object" && err && "code" in err ? (err as { code?: unknown }).code : undefined

    // 处理唯一约束冲突（sequenceNo 重复）
    if (typeof errorCode === "string" && errorCode === "23505") {
      return jsonError(409, "SEQUENCE_CONFLICT", "Report generation conflict, please retry", message)
    }

    console.error("POST /api/daily-closures/confirm error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to confirm daily closure", message)
  }
}
