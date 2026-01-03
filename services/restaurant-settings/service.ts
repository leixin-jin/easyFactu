/**
 * 餐厅设置服务模块
 *
 * 负责餐厅设置的读取与更新
 */

import 'server-only'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import { restaurantSettings } from '@/db/schema'
import type { UpdateRestaurantSettingsInput } from '@/lib/contracts/settings'

// 数据库类型定义
type DbClient = NodePgDatabase<typeof schema>

export interface RestaurantSettingsResponse {
    id: string | null
    restaurantName: string
    address: string | null
    phone: string | null
    email: string | null
    taxRate: string
    currency: string
    businessHours: string | null
}

const defaultSettings: Omit<RestaurantSettingsResponse, 'id'> = {
    restaurantName: '意式餐厅',
    address: '123 Main Street, City',
    phone: '+1 234 567 8900',
    email: 'info@restaurant.com',
    taxRate: '0.1000',
    currency: 'EUR',
    businessHours: '周一至周五: 11:00 - 22:00\n周六至周日: 10:00 - 23:00',
}

function toSettingsResponse(
    row: typeof restaurantSettings.$inferSelect
): RestaurantSettingsResponse {
    return {
        id: row.id,
        restaurantName: row.restaurantName,
        address: row.address,
        phone: row.phone,
        email: row.email,
        taxRate: row.taxRate,
        currency: row.currency,
        businessHours: row.businessHours,
    }
}

export async function getRestaurantSettings(
    db: DbClient
): Promise<RestaurantSettingsResponse> {
    const rows = await db.select().from(restaurantSettings).limit(1)

    if (rows.length === 0) {
        return {
            id: null,
            ...defaultSettings,
        }
    }

    return toSettingsResponse(rows[0])
}

export async function upsertRestaurantSettings(
    db: DbClient,
    input: UpdateRestaurantSettingsInput
): Promise<RestaurantSettingsResponse> {
    const { restaurantName, address, phone, email, taxRate, currency, businessHours } =
        input

    const existing = await db.select().from(restaurantSettings).limit(1)

    let result: typeof restaurantSettings.$inferSelect | undefined

    if (existing.length === 0) {
        const [inserted] = await db
            .insert(restaurantSettings)
            .values({
                restaurantName,
                address,
                phone,
                email,
                taxRate,
                currency,
                businessHours,
            })
            .returning()

        result = inserted
    } else {
        const [updated] = await db
            .update(restaurantSettings)
            .set({
                restaurantName,
                address,
                phone,
                email,
                taxRate,
                currency,
                businessHours,
                updatedAt: new Date(),
            })
            .returning()

        result = updated
    }

    if (!result) {
        throw new Error('Failed to save restaurant settings')
    }

    return toSettingsResponse(result)
}
