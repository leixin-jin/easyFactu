// API Types
export type {
  ApiResponse,
  ApiError,
  TableStatus,
  TableResponse,
  TableListResponse,
  CreateTableInput,
  MenuItemResponse,
  CategoryResponse,
  MenuListResponse,
  CreateMenuItemInput,
  OrderStatus,
  OrderItemView,
  OrderBatchView,
  OrderSummary,
  OrderResponse,
  CreateOrderInput,
  CreateOrderItemInput,
  CheckoutInput,
  CheckoutResponse,
  ClearOrderInput,
  UpdateOrderItemInput,
  TransferOrderInput,
  TransferOrderResponse,
} from "./api"

// Database Types
export type {
  MenuItem,
  NewMenuItem,
  RestaurantTable,
  NewRestaurantTable,
  Order,
  NewOrder,
  OrderItem,
  NewOrderItem,
  Transaction,
  NewTransaction,
  TransactionType,
} from "./database"

// POS UI Types (kept for backward compatibility)
export type {
  MenuItem as PosMenuItem,
  CartItem,
  CurrentOrderSummary,
  AAItemSelection,
  ReceiptItem,
  CheckoutReceiptData,
} from "./pos"

// Re-export from order-utils for convenience
export type { OrderBatchView as LegacyOrderBatchView, OrderItemView as LegacyOrderItemView } from "@/lib/order-utils"
