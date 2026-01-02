/**
 * 结账 API 路由
 * 
 * POST /api/orders/checkout
 * 处理订单结账（支持全额结账和 AA 结账）
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { checkoutInputSchema } from '@/lib/contracts/orders'
import { processCheckout } from '@/services/orders/checkout'
import { AppError } from '@/lib/http/errors'

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const json = await req.json().catch(() => ({}))

    // 使用 contracts 进行参数校验
    const parseResult = checkoutInputSchema.safeParse(json)
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
    const result = await processCheckout(db, parseResult.data)

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
    console.error('POST /api/orders/checkout error', err)
    return NextResponse.json(
      {
        error: 'Failed to checkout order',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
