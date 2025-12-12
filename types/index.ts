// API types
export type {
  ApiResponse,
  ApiError,
  MenuItemResponse,
  CategoryResponse,
  MenuItemListResponse,
  CreateMenuItemInput,
  TableResponse,
  TableListResponse,
  CreateTableInput,
  OrderSummary,
  OrderResponse,
  CreateOrderInput,
  ClearOrderInput,
  CheckoutInput,
  CheckoutResponse,
  TransferOrderInput,
  UpdateOrderItemInput,
  OrderBatchView,
  OrderItemView,
} from "./api"

// Database types
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
} from "./database"

// POS UI types (legacy - kept for backward compatibility)
export type {
  MenuItem as POSMenuItem,
  CartItem,
  CurrentOrderSummary,
  AAItemSelection,
  ReceiptItem,
  CheckoutReceiptData,
} from "./pos"
