/**
 * 清空订单 API 路由
 * 
 * POST /api/orders/clear - 清空桌台订单
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { clearTableOrder } from '@/services/orders/clear'
import { AppError } from '@/lib/http/errors'
import { clearOrderInputSchema } from '@/lib/contracts/orders'

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const json = await req.json().catch(() => ({}))
    const parseResult = clearOrderInputSchema.safeParse(json)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          detail: parseResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    // 调用 Service 处理业务逻辑
    const db = getDb()
    const result = await clearTableOrder(db, parseResult.data.tableId)

    return NextResponse.json(result, { status: 200 })
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
    console.error('POST /api/orders/clear error', err)
    return NextResponse.json(
      {
        error: 'Failed to clear order',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
