import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { createMenuItem, getAllMenuItems } from "@/services/menu";
import { withHandler } from "@/lib/http";
import { ValidationError } from "@/lib/http/errors";
import { createMenuItemInputSchema } from "@/lib/contracts/menu";

/**
 * GET /api/menu-items
 * 
 * 获取所有可用菜单项
 */
export const GET = withHandler(async () => {
  const db = getDb();

  return await getAllMenuItems(db);
});

/**
 * POST /api/menu-items
 * 
 * 创建新菜单项
 */
export const POST = withHandler(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("无效的 JSON 格式");
  }

  const parseResult = createMenuItemInputSchema.safeParse(body);
  if (!parseResult.success) {
    throw new ValidationError("请求参数无效", parseResult.error.flatten());
  }

  const db = getDb();
  return await createMenuItem(db, parseResult.data);
});
