/**
 * 环境变量类型安全化模块
 * 
 * 使用 Zod 在模块加载时校验关键环境变量
 * 
 * 注意：此文件被拆分为客户端和服务端两部分
 * - 客户端变量：NEXT_PUBLIC_ 前缀，可在浏览器中访问
 * - 服务端变量：仅在服务端使用
 */

import { z } from 'zod'

/**
 * 客户端环境变量 Schema
 * 这些变量可以在客户端和服务端都访问
 */
const clientEnvSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL 必须是有效的 URL'),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 不能为空'),
})

/**
 * 服务端环境变量 Schema
 * 这些变量仅在服务端可访问
 */
const serverEnvSchema = z.object({
    DATABASE_URL: z.string().url('DATABASE_URL 必须是有效的 URL'),
})

/**
 * 解析客户端环境变量
 */
function parseClientEnv() {
    const result = clientEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    })

    if (!result.success) {
        const formattedErrors = result.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n')

        console.error('❌ 客户端环境变量校验失败:\n' + formattedErrors)
        throw new Error('客户端环境变量校验失败')
    }

    return result.data
}

/**
 * 解析服务端环境变量
 * 仅在服务端调用时执行
 */
function parseServerEnv() {
    // 在客户端不校验服务端变量
    if (typeof window !== 'undefined') {
        return null
    }

    const result = serverEnvSchema.safeParse({
        DATABASE_URL: process.env.DATABASE_URL,
    })

    if (!result.success) {
        const formattedErrors = result.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n')

        console.error('❌ 服务端环境变量校验失败:\n' + formattedErrors)

        if (process.env.NODE_ENV === 'development') {
            console.error('\n💡 请检查 .env.local 文件是否包含: DATABASE_URL')
        }

        throw new Error('服务端环境变量校验失败')
    }

    return result.data
}

/**
 * 客户端环境变量（在客户端和服务端都可用）
 */
export const clientEnv = parseClientEnv()

/**
 * 获取服务端环境变量
 * 仅在服务端调用，客户端调用会报错
 */
export function getServerEnv() {
    if (typeof window !== 'undefined') {
        throw new Error('服务端环境变量不能在客户端访问')
    }

    const serverVars = parseServerEnv()
    if (!serverVars) {
        throw new Error('服务端环境变量解析失败')
    }

    return {
        ...clientEnv,
        ...serverVars,
    }
}

/**
 * 类型定义
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema> & ClientEnv
