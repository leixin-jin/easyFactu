/**
 * 报表服务模块
 *
 * 负责报表相关的业务逻辑处理
 */

import 'server-only'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { buildReportsPayload } from '@/lib/reports/aggregate'
import type { ReportGranularity } from '@/lib/reports/types'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

/**
 * 获取报表数据
 */
export async function getReports(
    db: DbClient,
    granularity: ReportGranularity = 'month'
) {
    const payload = await buildReportsPayload({
        db: db as any,
        granularity,
    })

    return payload
}
