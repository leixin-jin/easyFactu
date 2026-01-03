/**
 * 结账历史 API 路由
 * 
 * GET /api/checkout-history - 获取最近的 POS 结账交易
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { getCheckoutHistory } from '@/services/checkout-history'
import { AppError } from '@/lib/http/errors'
import { checkoutHistoryQuerySchema } from '@/lib/contracts/checkout-history'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit') ?? undefined
    const queryParse = checkoutHistoryQuerySchema.safeParse({ limit: limitParam })

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
    const items = await getCheckoutHistory(db, queryParse.data.limit)

    return NextResponse.json({ items }, { status: 200 })
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
    console.error('GET /api/checkout-history error', err)
    return NextResponse.json(
      {
        error: 'Failed to load checkout history',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
