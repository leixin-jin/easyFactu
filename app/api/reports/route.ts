/**
 * 报表 API 路由
 * 
 * GET /api/reports - 获取报表数据
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { getReports } from '@/services/reports'
import type { ReportGranularity } from '@/lib/reports/types'
import { AppError } from '@/lib/http/errors'
import { reportGranularityQuerySchema } from '@/lib/contracts/reports'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const granularityParam = url.searchParams.get('granularity') || undefined
    const queryParse = reportGranularityQuerySchema.safeParse({ granularity: granularityParam })

    if (!queryParse.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          detail: queryParse.error.flatten(),
        },
        { status: 400 }
      )
    }

    // 调用 Service 处理业务逻辑
    const db = getDb()
    const result = await getReports(db, queryParse.data.granularity as ReportGranularity)

    return NextResponse.json(result)
  } catch (err: unknown) {
    // 处理 AppError 及其子类
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          detail: err.detail,
        },
        { status: err.statusCode }
      )
    }

    // 处理未知错误
    const message = err instanceof Error ? err.message : String(err)
    console.error('GET /api/reports error', err)
    return NextResponse.json(
      {
        error: 'Failed to load reports',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
