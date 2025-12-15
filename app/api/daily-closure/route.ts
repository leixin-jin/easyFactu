import { NextRequest, NextResponse } from "next/server"

import { getDb } from "@/lib/db"
import {
  computeClosureSnapshotByRange,
  DEFAULT_DAILY_CLOSURE_TAX_RATE,
  getOrInitDailyClosureState,
  toIsoString,
} from "@/app/api/daily-closure/utils"
import { buildDailyClosurePayments } from "@/lib/daily-closure/calculate"

function jsonError(status: number, code: string, error: string, detail?: unknown) {
  return NextResponse.json({ error, code, detail }, { status })
}

/**
 * GET /api/daily-closure
 * 返回当前统计区间的预览数据
 * - periodStartAt: 从 daily_closure_state.current_period_start_at 读取
 * - periodEndAt: 当前时刻（now）
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb()

    // 获取当前统计区间起点
    const state = await getOrInitDailyClosureState(db as any)
    const periodStartAt = state.currentPeriodStartAt
    const periodEndAt = new Date()
    const taxRate = DEFAULT_DAILY_CLOSURE_TAX_RATE

    // 计算当前区间的预览快照
    const snapshot = await computeClosureSnapshotByRange(
      db as any,
      periodStartAt,
      periodEndAt,
      taxRate
    )

    return NextResponse.json({
      periodStartAt: toIsoString(periodStartAt),
      periodEndAt: toIsoString(periodEndAt),
      sequenceNo: null, // 预览状态，尚未生成报告
      taxRate,
      locked: false,
      closureId: null,
      lockedAt: null,
      lastReportSequenceNo: state.nextSequenceNo > 1 ? state.nextSequenceNo - 1 : null,
      overview: snapshot.overview,
      payments: buildDailyClosurePayments(snapshot.paymentLines, []),
      items: snapshot.items,
      adjustments: [],
      meta: {
        refundVoidPolicy:
          "当前系统未实现退款/作废流水统计口径，接口固定返回 0（后续可通过 transactions 扩展）。",
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("GET /api/daily-closure error", err)
    return jsonError(500, "INTERNAL_ERROR", "Failed to load daily closure preview", message)
  }
}
