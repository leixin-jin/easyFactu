/**
 * 日结预览 API 路由
 * 
 * GET /api/daily-closure
 * 返回当前统计区间的预览数据
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { getCurrentClosurePreview } from '@/services/daily-closures'
import { AppError } from '@/lib/http/errors'

export async function GET(_req: NextRequest) {
  try {
    const db = getDb()
    const result = await getCurrentClosurePreview(db)

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
    console.error('GET /api/daily-closure error', err)
    return NextResponse.json(
      {
        error: 'Failed to load daily closure preview',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
