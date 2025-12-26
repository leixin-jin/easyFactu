/**
 * 统一 API 响应工具
 * 
 * 提供标准化的响应格式和错误处理
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError } from './errors'

/**
 * 成功响应结构
 */
interface SuccessResponse<T> {
    data: T
}

/**
 * 错误响应结构
 */
interface ErrorResponse {
    error: string
    code: string
    detail?: unknown
}

/**
 * 返回成功响应
 * 
 * @param data - 响应数据
 * @param status - HTTP 状态码，默认 200
 */
export function jsonOk<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
    return NextResponse.json({ data }, { status })
}

/**
 * 返回错误响应
 * 
 * @param status - HTTP 状态码
 * @param code - 错误代码
 * @param error - 错误消息
 * @param detail - 错误详情（可选）
 */
export function jsonError(
    status: number,
    code: string,
    error: string,
    detail?: unknown
): NextResponse<ErrorResponse> {
    const body: ErrorResponse = { error, code }
    if (detail !== undefined) {
        body.detail = detail
    }
    return NextResponse.json(body, { status })
}

/**
 * API 路由处理器类型
 */
type ApiHandler<T> = (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
) => Promise<T>

/**
 * 统一错误处理包装器
 * 
 * 自动处理以下错误类型：
 * - AppError 及其子类：使用对应 statusCode
 * - ZodError：400 VALIDATION_ERROR
 * - 数据库唯一约束错误 (code=23505)：409 DUPLICATE_ENTRY
 * - 其他错误：500 INTERNAL_ERROR
 * 
 * @param handler - API 路由处理函数
 */
export function withHandler<T>(
    handler: ApiHandler<T>
): (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<SuccessResponse<T> | ErrorResponse>> {
    return async (req, context) => {
        try {
            const result = await handler(req, context)
            return jsonOk(result)
        } catch (error) {
            // AppError 及其子类
            if (error instanceof AppError) {
                return jsonError(error.statusCode, error.code, error.message, error.detail)
            }

            // Zod 校验错误
            if (error instanceof ZodError) {
                return jsonError(400, 'VALIDATION_ERROR', '请求参数验证失败', error.flatten())
            }

            // 数据库唯一约束错误
            if (isPostgresUniqueViolation(error)) {
                return jsonError(409, 'DUPLICATE_ENTRY', '数据已存在')
            }

            // 其他错误
            const message = error instanceof Error ? error.message : '未知错误'
            console.error('API Error:', error)
            return jsonError(500, 'INTERNAL_ERROR', message)
        }
    }
}

/**
 * 检查是否为 PostgreSQL 唯一约束违规错误
 */
function isPostgresUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false
    }
    // PostgreSQL 唯一约束违规错误代码
    return (error as Record<string, unknown>).code === '23505'
}
