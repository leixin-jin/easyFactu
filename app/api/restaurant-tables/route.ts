import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { withHandler } from "@/lib/http";
import { ValidationError } from "@/lib/http/errors";
import { createTableInputSchema } from "@/lib/contracts/tables";
import { createTable, getAllTables } from "@/services/tables";

/**
 * GET /api/restaurant-tables
 * 
 * 获取所有桌台列表，包含当前待付金额
 */
export const GET = withHandler(async () => {
  const db = getDb();
  return await getAllTables(db);
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

  const db = getDb();
  return await createTable(db, parseResult.data);
});
