import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { getRestaurantSettings, upsertRestaurantSettings } from "@/services/restaurant-settings";
import { updateRestaurantSettingsInputSchema } from "@/lib/contracts/settings";

/**
 * GET /api/restaurant-settings
 * Returns the current restaurant settings, or default values if none exist
 */
export async function GET() {
    try {
        const db = getDb();
        const settings = await getRestaurantSettings(db);
        return NextResponse.json(settings, { status: 200 });
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

    const parseResult = updateRestaurantSettingsInputSchema.safeParse(body);
    if (!parseResult.success) {
        return NextResponse.json(
            {
                error: "Invalid request body",
                detail: parseResult.error.flatten(),
            },
            { status: 400 }
        );
    }

    try {
        const db = getDb();
        const result = await upsertRestaurantSettings(db, parseResult.data);
        return NextResponse.json(result, { status: 200 });
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
