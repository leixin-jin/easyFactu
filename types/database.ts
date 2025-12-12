import type {
  menuItems,
  restaurantTables,
  orders,
  orderItems,
  transactions,
} from "@/db/schema"

// Database Entity Types (inferred from Drizzle schema)
export type MenuItem = typeof menuItems.$inferSelect
export type NewMenuItem = typeof menuItems.$inferInsert
export type RestaurantTable = typeof restaurantTables.$inferSelect
export type NewRestaurantTable = typeof restaurantTables.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

// Enum Types
export type TableStatus = "idle" | "occupied"
export type OrderStatus = "open" | "paid" | "cancelled"
export type TransactionType = "income" | "expense"
