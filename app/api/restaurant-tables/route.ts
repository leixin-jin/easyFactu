import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { orders, restaurantTables } from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { withHandler } from "@/lib/http";
import { ConflictError, ValidationError } from "@/lib/http/errors";
import { createTableInputSchema } from "@/lib/contracts/tables";

/**
 * GET /api/restaurant-tables
 * 
 * 获取所有桌台列表，包含当前待付金额
 */
export const GET = withHandler(async () => {
  const db = getDb();

  const rows = await db
    .select({
      id: restaurantTables.id,
      number: restaurantTables.number,
      capacity: restaurantTables.capacity,
      status: restaurantTables.status,
      area: restaurantTables.area,
      orderTotalAmount: orders.totalAmount,
      orderPaidAmount: orders.paidAmount,
    })
    .from(restaurantTables)
    .leftJoin(
      orders,
      and(eq(orders.tableId, restaurantTables.id), eq(orders.status, "open")),
    );

  const mapped = rows.map((row) => {
    const totalAmount = parseMoney(row.orderTotalAmount);
    const paidAmount = parseMoney(row.orderPaidAmount);

    const outstanding = Math.max(0, totalAmount - paidAmount);

    return {
      id: row.id,
      number: row.number,
      capacity: row.capacity,
      status: row.status,
      area: row.area,
      amount: outstanding || null,
    };
  });

  return mapped;
});

/**
 * POST /api/restaurant-tables
 * 
 * 创建新桌台
 */
export const POST = withHandler(async (req: NextRequest) => {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ValidationError("无效的 JSON 格式");
  }

  const parseResult = createTableInputSchema.safeParse(json);

  if (!parseResult.success) {
    throw new ValidationError("请求参数无效", parseResult.error.flatten());
  }

  const { number, area, capacity } = parseResult.data;

  const db = getDb();

  const [existing] = await db
    .select({ id: restaurantTables.id })
    .from(restaurantTables)
    .where(eq(restaurantTables.number, number))
    .limit(1);

  if (existing) {
    throw new ConflictError("桌号已存在");
  }

  const [created] = await db
    .insert(restaurantTables)
    .values({
      number,
      area,
      capacity,
      status: "idle",
      currentGuests: 0,
      amount: "0",
    })
    .returning({
      id: restaurantTables.id,
      number: restaurantTables.number,
      area: restaurantTables.area,
      capacity: restaurantTables.capacity,
      status: restaurantTables.status,
    });

  return created;
});
