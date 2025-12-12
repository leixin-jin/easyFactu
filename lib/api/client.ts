import { get, post, patch, del } from "./fetcher"
import type {
  MenuItemResponse,
  MenuItemListResponse,
  CreateMenuItemInput,
  TableResponse,
  TableListResponse,
  CreateTableInput,
  OrderResponse,
  CreateOrderInput,
  ClearOrderInput,
  CheckoutInput,
  CheckoutResponse,
  TransferOrderInput,
  UpdateOrderItemInput,
} from "@/types/api"

export const api = {
  // Menu Items
  menuItems: {
    list: () => get<MenuItemListResponse>("/api/menu-items"),
    create: (data: CreateMenuItemInput) => post<MenuItemResponse>("/api/menu-items", data),
    delete: (id: string) => del<void>(`/api/menu-items/${encodeURIComponent(id)}`),
  },

  // Restaurant Tables
  tables: {
    list: () => get<TableListResponse>("/api/restaurant-tables"),
    create: (data: CreateTableInput) => post<TableResponse>("/api/restaurant-tables", data),
    delete: (id: string) => del<void>(`/api/restaurant-tables/${encodeURIComponent(id)}`),
  },

  // Orders
  orders: {
    get: (tableId: string) =>
      get<OrderResponse>(`/api/orders?tableId=${encodeURIComponent(tableId)}`),
    create: (data: CreateOrderInput) => post<OrderResponse>("/api/orders", data),
    updateItem: (itemId: string, data: UpdateOrderItemInput) =>
      patch<OrderResponse>(`/api/orders/${encodeURIComponent(itemId)}`, data),
    clear: (data: ClearOrderInput) => post<OrderResponse>("/api/orders/clear", data),
    checkout: (data: CheckoutInput) => post<CheckoutResponse>("/api/orders/checkout", data),
    transfer: (data: TransferOrderInput) => post<OrderResponse>("/api/orders/transfer", data),
  },
}
