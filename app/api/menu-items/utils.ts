import type { MenuItem as MenuItemRecord } from "@/db/schema";
import { parseMoney } from "@/lib/money";

export interface MenuItemResponse {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  price: number;
  cost: number | null;
  description: string | null;
  image: string | null;
  available: boolean;
  popular: boolean;
  spicy: number;
  allergens: string[];
  sales: number | null;
  revenue: number;
}

export function toMenuItemResponse(row: MenuItemRecord): MenuItemResponse {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.nameEn ?? "",
    category: row.category,
    price: parseMoney(row.price),
    cost: row.cost != null ? parseMoney(row.cost) : null,
    description: row.description ?? null,
    image: row.image ?? null,
    available: row.available,
    popular: row.popular ?? false,
    spicy: row.spicy ?? 0,
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    sales: row.sales ?? null,
    revenue: parseMoney(row.revenue),
  };
}
