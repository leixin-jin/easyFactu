import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { restaurantSettings } from "@/db/schema";

// Zod schema for validating update requests
const updateSettingsSchema = z.object({
    restaurantName: z.string().min(1, "餐厅名称不能为空").max(120),
    address: z
        .string()
        .max(500)
        .nullable()
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null)),
    phone: z
        .string()
        .max(50)
        .nullable()
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null)),
    email: z
        .string()
        .nullable()
        .optional()
        .transform((value) => {
            if (!value || value.length === 0) return null;
            // Simple email validation - if it looks like an email, keep it; otherwise null
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? value : null;
        }),
    taxRate: z
        .string()
        .regex(/^\d+(\.\d{1,4})?$/, "请输入有效的税率")
        .transform((value) => value),
    currency: z.enum(["EUR", "USD", "GBP", "CNY"]),
    businessHours: z
        .string()
        .max(1000)
        .nullable()
        .optional()
        .transform((value) => (value && value.length > 0 ? value : null)),
});

// Default settings to return when no record exists
const defaultSettings = {
    restaurantName: "意式餐厅",
    address: "123 Main Street, City",
    phone: "+1 234 567 8900",
    email: "info@restaurant.com",
    taxRate: "0.1000",
    currency: "EUR",
    businessHours: "周一至周五: 11:00 - 22:00\n周六至周日: 10:00 - 23:00",
};

// Response type for consistency
type SettingsResponse = {
    id: string | null;
    restaurantName: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    taxRate: string;
    currency: string;
    businessHours: string | null;
};

function toSettingsResponse(row: typeof restaurantSettings.$inferSelect): SettingsResponse {
    return {
        id: row.id,
        restaurantName: row.restaurantName,
        address: row.address,
        phone: row.phone,
        email: row.email,
        taxRate: row.taxRate,
        currency: row.currency,
        businessHours: row.businessHours,
    };
}

/**
 * GET /api/restaurant-settings
 * Returns the current restaurant settings, or default values if none exist
 */
export async function GET() {
    try {
        const db = getDb();

        const rows = await db.select().from(restaurantSettings).limit(1);

        if (rows.length === 0) {
            // Return default settings if no record exists
            return NextResponse.json(
                {
                    id: null,
                    ...defaultSettings,
                },
                { status: 200 }
            );
        }

        return NextResponse.json(toSettingsResponse(rows[0]), { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("GET /api/restaurant-settings error", err);
        return NextResponse.json(
            {
                error: "Failed to load restaurant settings",
                detail: message,
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/restaurant-settings
 * Updates the restaurant settings (upserts if no record exists)
 */
export async function PUT(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = updateSettingsSchema.safeParse(body);
    if (!parseResult.success) {
        return NextResponse.json(
            {
                error: "Invalid request body",
                detail: parseResult.error.flatten(),
            },
            { status: 400 }
        );
    }

    const { restaurantName, address, phone, email, taxRate, currency, businessHours } =
        parseResult.data;

    try {
        const db = getDb();

        // Check if a settings record already exists
        const existing = await db.select().from(restaurantSettings).limit(1);

        let result;

        if (existing.length === 0) {
            // Insert new record
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
                .returning();

            result = inserted;
        } else {
            // Update existing record
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
                .returning();

            result = updated;
        }

        if (!result) {
            return NextResponse.json(
                { error: "Failed to save restaurant settings" },
                { status: 500 }
            );
        }

        return NextResponse.json(toSettingsResponse(result), { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("PUT /api/restaurant-settings error", err);
        return NextResponse.json(
            {
                error: "Failed to save restaurant settings",
                detail: message,
            },
            { status: 500 }
        );
    }
}
