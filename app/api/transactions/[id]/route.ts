/**
 * 交易详情 API 路由
 * 
 * GET /api/transactions/[id] - 获取交易详情
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { getTransactionDetails } from '@/services/transactions'
import { AppError } from '@/lib/http/errors'
import { uuidParamSchema } from '@/lib/contracts/common'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 验证 ID 格式（使用 contracts）
    const idParse = uuidParamSchema.safeParse({ id })
    if (!idParse.success) {
      return NextResponse.json(
        { error: 'Transaction ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // 调用 Service 处理业务逻辑
    const db = getDb()
    const result = await getTransactionDetails(db, id)

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
    console.error('GET /api/transactions/[id] error', err)
    return NextResponse.json(
      {
        error: 'Failed to get transaction',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
