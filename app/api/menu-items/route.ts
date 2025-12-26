import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { toMenuItemResponse, type MenuItemResponse } from "@/app/api/menu-items/utils";
import { toMoneyString } from "@/lib/money";
import { withHandler } from "@/lib/http";
import { ConflictError, ValidationError } from "@/lib/http/errors";
import { createMenuItemInputSchema } from "@/lib/contracts/menu";

/**
 * GET /api/menu-items
 * 
 * 获取所有可用菜单项
 */
export const GET = withHandler(async () => {
  const db = getDb();

  const rows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.available, true));

  const items = rows.map(toMenuItemResponse);
  const categories = buildCategories(items);

  return { categories, items };
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

  const { name, nameEn, category, price, description, image } = parseResult.data;

  const db = getDb();

  const [duplicate] = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(
      and(
        eq(menuItems.name, name),
        eq(menuItems.category, category),
        eq(menuItems.available, true),
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new ConflictError("该分类下已存在同名菜品");
  }

  const [created] = await db
    .insert(menuItems)
    .values({
      name,
      nameEn,
      category,
      price: toMoneyString(price),
      description,
      image,
    })
    .returning();

  if (!created) {
    throw new Error("创建菜品失败");
  }

  return toMenuItemResponse(created);
});

function buildCategories(items: MenuItemResponse[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  return [
    { id: "all", name: "全部菜品", count: items.length },
    ...Array.from(counts.entries()).map(([id, count]) => ({
      id,
      name: id,
      count,
    })),
  ];
}
