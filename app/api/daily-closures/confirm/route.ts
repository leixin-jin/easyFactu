/**
 * 确认日结 API 路由
 * 
 * POST /api/daily-closures/confirm
 * 生成一份新的日结报告并推进统计区间
 */

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { confirmDailyClosure } from '@/services/daily-closures'
import { AppError } from '@/lib/http/errors'
import { confirmClosureInputSchema } from '@/lib/contracts/daily-closures'

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const json = await req.json().catch(() => ({}))
    const parseResult = confirmClosureInputSchema.safeParse(json)

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
    const result = await confirmDailyClosure(db, parseResult.data)

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

    // 处理唯一约束冲突（sequenceNo 重复）
    const errorCode =
      typeof err === 'object' && err && 'code' in err
        ? (err as { code?: unknown }).code
        : undefined
    if (typeof errorCode === 'string' && errorCode === '23505') {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        {
          error: 'Report generation conflict, please retry',
          code: 'SEQUENCE_CONFLICT',
          detail: message,
        },
        { status: 409 }
      )
    }

    // 处理未知错误
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST /api/daily-closures/confirm error', err)
    return NextResponse.json(
      {
        error: 'Failed to confirm daily closure',
        code: 'INTERNAL_ERROR',
        detail: message,
      },
      { status: 500 }
    )
  }
}
