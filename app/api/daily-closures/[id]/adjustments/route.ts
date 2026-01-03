/**
 * 日结调整 API 路由
 * 
 * POST /api/daily-closures/[id]/adjustments
 * 添加日结调整
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { addClosureAdjustment, getClosureAdjustments } from '@/services/daily-closures'
import { AppError } from '@/lib/http/errors'
import { closureAdjustmentInputSchema } from '@/lib/contracts/daily-closures'
import { uuidParamSchema } from '@/lib/contracts/common'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  // 验证 ID 格式
  const idParse = uuidParamSchema.safeParse({ id })
  if (!idParse.success) {
    return NextResponse.json(
      { error: 'Invalid daily closure id', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    // 解析请求体
    const json = await req.json().catch(() => ({}))
    const parseResult = closureAdjustmentInputSchema.safeParse(json)

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

    // 调用 Service 添加调整
    const db = getDb()
    await addClosureAdjustment(db, id, parseResult.data)

    // 获取所有调整返回
    const adjustments = await getClosureAdjustments(db, id)

    return NextResponse.json({
      adjustments,
    })
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
    console.error('POST /api/daily-closures/[id]/adjustments error', err)
    return NextResponse.json(
      {
        error: 'Failed to create adjustment',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
