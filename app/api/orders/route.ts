/**
 * 订单 API 路由
 * 
 * POST /api/orders - 创建订单或添加订单项
 * GET /api/orders - 获取桌台当前订单
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { createOrderInputSchema } from '@/lib/contracts/orders'
import { createOrderOrAddItems, getTableOrder } from '@/services/orders/create'
import { AppError } from '@/lib/http/errors'

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const json = await req.json()

    // 使用 contracts 进行参数校验
    const parseResult = createOrderInputSchema.safeParse(json)
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
    const result = await createOrderOrAddItems(db, parseResult.data)

    return NextResponse.json(result, { status: 201 })
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

    // 处理数据库唯一约束错误
    const errorCode =
      typeof err === 'object' && err && 'code' in err
        ? (err as { code?: unknown }).code
        : undefined
    if (typeof errorCode === 'string' && errorCode === '23505') {
      const message = err instanceof Error ? err.message : String(err)
      console.error('POST /api/orders unique open-order violation', err)
      return NextResponse.json(
        {
          error: 'Open order already exists for table',
          code: 'OPEN_ORDER_ALREADY_EXISTS',
          detail: message,
        },
        { status: 409 }
      )
    }

    // 处理未知错误
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST /api/orders error', err)
    return NextResponse.json(
      {
        error: 'Failed to create order batch',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tableId = searchParams.get('tableId')

    if (!tableId) {
      return NextResponse.json(
        { error: 'Missing tableId', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // 调用 Service 处理业务逻辑
    const db = getDb()
    const result = await getTableOrder(db, tableId)

    if (!result) {
      return NextResponse.json(
        {
          order: null,
          batches: [],
        },
        { status: 200 }
      )
    }

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
    console.error('GET /api/orders error', err)
    return NextResponse.json(
      {
        error: 'Failed to fetch orders for table',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
