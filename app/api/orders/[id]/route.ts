/**
 * 订单项 API 路由
 * 
 * PATCH /api/orders/[id] - 更新订单项（减少数量或删除）
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { updateOrderItem } from '@/services/orders/update-item'
import { AppError } from '@/lib/http/errors'
import { updateOrderItemInputSchema } from '@/lib/contracts/orders'
import { uuidParamSchema } from '@/lib/contracts/common'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  // 验证 ID 格式
  const idParse = uuidParamSchema.safeParse({ id })
  if (!idParse.success) {
    return NextResponse.json(
      { error: 'Invalid order item id', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    // 解析请求体
    const json = await req.json().catch(() => ({}))
    const parseResult = updateOrderItemInputSchema.safeParse(json)

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
    const result = await updateOrderItem(db, id, parseResult.data.type)

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
    console.error('PATCH /api/orders/[id] error', err)
    return NextResponse.json(
      {
        error: 'Failed to update order item',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
