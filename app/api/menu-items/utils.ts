import type { MenuItem as MenuItemRecord } from "@/db/schema";
import { parseMoney } from "@/lib/money";

export interface MenuItemResponse {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  price: number;
  description: string | null;
  image: string | null;
  available: boolean;
}

export function toMenuItemResponse(row: MenuItemRecord): MenuItemResponse {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.nameEn ?? "",
    category: row.category,
    price: parseMoney(row.price),
    description: row.description ?? null,
    image: row.image ?? null,
    available: row.available,
  };
}
