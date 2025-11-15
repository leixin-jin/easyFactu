import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  smallint,
  timestamp,
  date,
  numeric,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const staffStatus = pgEnum("staff_status", ["active", "inactive"]);
export const tableStatus = pgEnum("table_status", ["idle", "occupied"]);
export const orderStatus = pgEnum("order_status", ["open", "paid", "cancelled"]);
export const transactionType = pgEnum("transaction_type", ["income", "expense"]);

// Staff
export const staff = pgTable("staff", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  status: staffStatus("status").notNull().default("active"),
  salary: integer("salary").notNull().default(0),
  joinDate: date("join_date").notNull().default(sql`now()`),
  performance: integer("performance").notNull().default(0),
  ordersServed: integer("orders_served").default(0),
  revenue: numeric("revenue", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

// Menu Items
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    category: text("category").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    description: text("description"),
    image: text("image"),
    available: boolean("available").notNull().default(true),
    popular: boolean("popular").notNull().default(false),
    spicy: smallint("spicy").default(0),
    // store allergens as text[]
    allergens: text("allergens").array(),
    sales: integer("sales").default(0),
    revenue: numeric("revenue", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => ({
    categoryIdx: index("menu_items_category_idx").on(t.category),
    nameIdx: index("menu_items_name_idx").on(t.name),
  }),
);

// Restaurant Tables
export const restaurantTables = pgTable(
  "restaurant_tables",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    number: text("number").notNull(),
    area: text("area"),
    capacity: integer("capacity").notNull().default(0),
    status: tableStatus("status").notNull().default("idle"),
    currentGuests: integer("current_guests").default(0),
    startedAt: timestamp("started_at", { withTimezone: false }),
    amount: numeric("amount", { precision: 12, scale: 2 }).default("0"),
    waiterId: uuid("waiter_id").references(() => staff.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => ({
    tableNumberIdx: index("restaurant_tables_number_idx").on(t.number),
    areaIdx: index("restaurant_tables_area_idx").on(t.area),
  }),
);

// Orders
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    tableId: uuid("table_id").references(() => restaurantTables.id, { onDelete: "set null" }),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }),
    status: orderStatus("status").notNull().default("open"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).default("0"),
    paymentMethod: text("payment_method"),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: false }),
  },
  (t) => ({
    statusIdx: index("orders_status_idx").on(t.status),
    tableIdx: index("orders_table_id_idx").on(t.tableId),
  }),
);

// Order Items
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    batchNo: integer("batch_no").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdx: index("order_items_order_id_idx").on(t.orderId),
    itemIdx: index("order_items_menu_item_id_idx").on(t.menuItemId),
    orderBatchIdx: index("order_items_order_id_batch_no_idx").on(t.orderId, t.batchNo),
  }),
);

// Financial Transactions
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    type: transactionType("type").notNull(),
    category: text("category").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    date: date("date").notNull().default(sql`now()`),
    paymentMethod: text("payment_method").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("transactions_type_idx").on(t.type),
    dateIdx: index("transactions_date_idx").on(t.date),
  }),
);

export const schema = {
  staff,
  menuItems,
  restaurantTables,
  orders,
  orderItems,
  transactions,
  staffStatus,
  tableStatus,
  orderStatus,
  transactionType,
};

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type NewRestaurantTable = typeof restaurantTables.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
