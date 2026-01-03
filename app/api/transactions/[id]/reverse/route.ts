/**
 * 反结算 API 路由
 * 
 * POST /api/transactions/[id]/reverse - 反结算交易
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { reverseTransaction } from '@/services/transactions'
import { AppError } from '@/lib/http/errors'
import { uuidParamSchema } from '@/lib/contracts/common'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: transactionId } = await params

    // 验证 ID 格式
    const idParse = uuidParamSchema.safeParse({ id: transactionId })
    if (!idParse.success) {
      return NextResponse.json(
        { error: 'Transaction ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // 调用 Service 处理业务逻辑
    const db = getDb()
    const result = await reverseTransaction(db, transactionId)

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
    console.error('POST /api/transactions/[id]/reverse error', err)
    return NextResponse.json(
      {
        error: 'Failed to reverse transaction',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
