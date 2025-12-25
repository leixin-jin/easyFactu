import { fetcher } from "./fetcher"
import type {
  TableResponse,
  CreateTableInput,
  MenuListResponse,
  MenuItemResponse,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  DeletedMenuListResponse,
  OrderResponse,
  CreateOrderInput,
  CheckoutInput,
  CheckoutResponse,
  ClearOrderInput,
  UpdateOrderItemInput,
  TransferOrderInput,
  DailyClosureResponse,
  ConfirmDailyClosureInput,
  CreateDailyClosureAdjustmentInput,
  CreateDailyClosureAdjustmentResponse,
  ReportsResponse,
  ReportGranularity,
  CheckoutHistoryResponse,
  TransactionDetailResponse,
  ReverseTransactionResponse,
} from "@/types/api"

export const api = {
  dailyClosure: {
    get: () =>
      fetcher<DailyClosureResponse>("/api/daily-closure"),
  },

  checkoutHistory: {
    list: ({ limit = 50 }: { limit?: number } = {}) =>
      fetcher<CheckoutHistoryResponse>(`/api/checkout-history?limit=${encodeURIComponent(String(limit))}`),
  },

  transactions: {
    getDetail: (id: string) =>
      fetcher<TransactionDetailResponse>(`/api/transactions/${encodeURIComponent(id)}`),

    reverse: (id: string) =>
      fetcher<ReverseTransactionResponse>(`/api/transactions/${encodeURIComponent(id)}/reverse`, {
        method: "POST",
      }),
  },

  dailyClosures: {
    confirm: (data: ConfirmDailyClosureInput) =>
      fetcher<DailyClosureResponse>("/api/daily-closures/confirm", {
        method: "POST",
        body: data,
      }),

    createAdjustment: (closureId: string, data: CreateDailyClosureAdjustmentInput) =>
      fetcher<CreateDailyClosureAdjustmentResponse>(
        `/api/daily-closures/${encodeURIComponent(closureId)}/adjustments`,
        {
          method: "POST",
          body: data,
        },
      ),

    exportUrl: (closureId: string, format: "pdf" | "xlsx") =>
      `/api/daily-closures/${encodeURIComponent(closureId)}/export?format=${encodeURIComponent(format)}`,
  },

  tables: {
    list: () => fetcher<TableResponse[]>("/api/restaurant-tables"),

    create: (data: CreateTableInput) =>
      fetcher<TableResponse>("/api/restaurant-tables", {
        method: "POST",
        body: data,
      }),

    delete: (id: string) =>
      fetcher<void>(`/api/restaurant-tables/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  menuItems: {
    list: () => fetcher<MenuListResponse>("/api/menu-items"),

    listDeleted: () => fetcher<DeletedMenuListResponse>("/api/menu-items/deleted"),

    create: (data: CreateMenuItemInput) =>
      fetcher<MenuItemResponse>("/api/menu-items", {
        method: "POST",
        body: data,
      }),

    update: (id: string, data: UpdateMenuItemInput) =>
      fetcher<MenuItemResponse>(`/api/menu-items/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: data,
      }),

    delete: (id: string) =>
      fetcher<MenuItemResponse>(`/api/menu-items/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),

    restore: (id: string) =>
      fetcher<MenuItemResponse>(`/api/menu-items/${encodeURIComponent(id)}/restore`, {
        method: "POST",
      }),
  },

  orders: {
    get: (tableId: string) =>
      fetcher<OrderResponse>(`/api/orders?tableId=${encodeURIComponent(tableId)}`),

    create: (data: CreateOrderInput) =>
      fetcher<OrderResponse>("/api/orders", {
        method: "POST",
        body: data,
      }),

    updateItem: (itemId: string, data: UpdateOrderItemInput) =>
      fetcher<OrderResponse>(`/api/orders/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        body: data,
      }),

    clear: (data: ClearOrderInput) =>
      fetcher<OrderResponse>("/api/orders/clear", {
        method: "POST",
        body: data,
      }),

    checkout: (data: CheckoutInput) =>
      fetcher<CheckoutResponse>("/api/orders/checkout", {
        method: "POST",
        body: data,
      }),

    transfer: (data: TransferOrderInput) =>
      fetcher<OrderResponse>("/api/orders/transfer", {
        method: "POST",
        body: data,
      }),
  },

  reports: {
    get: (granularity: ReportGranularity) =>
      fetcher<ReportsResponse>(`/api/reports?granularity=${encodeURIComponent(granularity)}`),

    exportUrl: (granularity: ReportGranularity, format: "xlsx" = "xlsx") =>
      `/api/reports/export?format=${encodeURIComponent(format)}&granularity=${encodeURIComponent(granularity)}`,
  },
}
