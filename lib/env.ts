/**
 * 环境变量类型安全化模块
 * 
 * 使用 Zod 校验关键环境变量
 * 
 * 注意：此文件被拆分为客户端和服务端两部分
 * - 客户端变量：NEXT_PUBLIC_ 前缀，可在浏览器中访问
 * - 服务端变量：仅在服务端使用
 * 
 * 重要：所有校验都是延迟执行的，只在首次访问时进行
 * 这样可以避免在构建时因环境变量未设置而失败
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

// 缓存已解析的环境变量
let cachedClientEnv: z.infer<typeof clientEnvSchema> | null = null

/**
 * 获取客户端环境变量
 * 延迟校验，首次调用时才进行验证
 */
export function getClientEnv(): z.infer<typeof clientEnvSchema> {
    if (cachedClientEnv) {
        return cachedClientEnv
    }

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

    cachedClientEnv = result.data
    return cachedClientEnv
}

/**
 * 客户端环境变量（延迟求值）
 * 
 * 使用 Proxy 实现延迟校验，只有在实际访问属性时才会触发校验
 * 这样可以避免在构建时因环境变量未设置而失败
 */
export const clientEnv = new Proxy({} as z.infer<typeof clientEnvSchema>, {
    get(_target, prop: string) {
        const env = getClientEnv()
        return env[prop as keyof typeof env]
    },
})

/**
 * 获取数据库连接 URL
 * 
 * 注意：此函数独立于客户端环境变量，仅校验 DATABASE_URL
 * 适用于不需要 Supabase 配置的场景（如 CI、本地脚本等）
 */
export function getDatabaseUrl(): string {
    if (typeof window !== 'undefined') {
        throw new Error('DATABASE_URL 不能在客户端访问')
    }

    const url = process.env.DATABASE_URL
    if (!url) {
        throw new Error('DATABASE_URL 环境变量未设置')
    }

    // 简单校验 URL 格式
    try {
        new URL(url)
    } catch {
        throw new Error('DATABASE_URL 必须是有效的 URL')
    }

    return url
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
        ...getClientEnv(),
        ...serverVars,
    }
}

/**
 * 类型定义
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema> & ClientEnv
