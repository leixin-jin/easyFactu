import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const tableStatus = pgEnum("table_status", ["idle", "occupied"]);
export const orderStatus = pgEnum("order_status", ["open", "paid", "cancelled"]);
export const transactionType = pgEnum("transaction_type", ["income", "expense"]);
export const dailyClosureAdjustmentType = pgEnum(
  "daily_closure_adjustment_type",
  ["fee", "rounding", "other"],
);
export const dailyClosurePaymentGroup = pgEnum(
  "daily_closure_payment_group",
  ["cash", "card", "platform", "other"],
);

// Menu Items
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    category: text("category").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    image: text("image"),
    available: boolean("available").notNull().default(true),
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
    status: orderStatus("status").notNull().default("open"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).default("0"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method"),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: false }),
  },
  (t) => ({
    statusIdx: index("orders_status_idx").on(t.status),
    tableIdx: index("orders_table_id_idx").on(t.tableId),
    closedAtIdx: index("orders_closed_at_idx").on(t.closedAt),
    uniqueOpenOrderPerTableIdx: uniqueIndex("uniq_open_order_per_table")
      .on(t.tableId)
      .where(sql`${t.status} = 'open'`),
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
    paidQuantity: integer("paid_quantity").notNull().default(0),
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
    createdAtIdx: index("transactions_created_at_idx").on(t.createdAt),
  }),
);

export const dailyClosures = pgTable(
  "daily_closures",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessDate: date("business_date"), // 保留但不再是唯一约束，允许同日多条记录
    sequenceNo: integer("sequence_no").notNull(), // 按用户点击顺序递增
    periodStartAt: timestamp("period_start_at", { withTimezone: false }).notNull(), // 统计区间起点
    periodEndAt: timestamp("period_end_at", { withTimezone: false }).notNull(), // 统计区间终点=生成时刻
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 })
      .notNull()
      .default("0.1000"),
    grossRevenue: numeric("gross_revenue", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    netRevenue: numeric("net_revenue", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ordersCount: integer("orders_count").notNull().default(0),
    refundAmount: numeric("refund_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    voidAmount: numeric("void_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    lockedAt: timestamp("locked_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    sequenceNoUniq: uniqueIndex("daily_closures_sequence_no_uniq").on(t.sequenceNo),
    periodStartIdx: index("daily_closures_period_start_at_idx").on(t.periodStartAt),
    periodEndIdx: index("daily_closures_period_end_at_idx").on(t.periodEndAt),
  }),
);

// 日结状态表 - 单行表，用于管理当前统计区间和序号
export const dailyClosureState = pgTable(
  "daily_closure_state",
  {
    id: integer("id").primaryKey().default(1), // 固定主键，只有一行
    currentPeriodStartAt: timestamp("current_period_start_at", { withTimezone: false }).notNull(),
    nextSequenceNo: integer("next_sequence_no").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
);

export const dailyClosureAdjustments = pgTable(
  "daily_closure_adjustments",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    closureId: uuid("closure_id")
      .notNull()
      .references(() => dailyClosures.id, { onDelete: "cascade" }),
    type: dailyClosureAdjustmentType("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    note: text("note").notNull(),
    paymentMethod: text("payment_method"),
    createdAt: timestamp("created_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    closureIdx: index("daily_closure_adjustments_closure_id_idx").on(
      t.closureId,
    ),
  }),
);

export const dailyClosurePaymentLines = pgTable(
  "daily_closure_payment_lines",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    closureId: uuid("closure_id")
      .notNull()
      .references(() => dailyClosures.id, { onDelete: "cascade" }),
    paymentMethod: text("payment_method").notNull(),
    paymentGroup: dailyClosurePaymentGroup("payment_group").notNull(),
    expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
  },
  (t) => ({
    closureIdx: index("daily_closure_payment_lines_closure_id_idx").on(
      t.closureId,
    ),
    uniqPaymentMethod: uniqueIndex(
      "daily_closure_payment_lines_closure_payment_method_uniq",
    ).on(t.closureId, t.paymentMethod),
  }),
);

export const dailyClosureItemLines = pgTable(
  "daily_closure_item_lines",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    closureId: uuid("closure_id")
      .notNull()
      .references(() => dailyClosures.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, {
      onDelete: "set null",
    }),
    nameSnapshot: text("name_snapshot").notNull(),
    categorySnapshot: text("category_snapshot").notNull(),
    quantitySold: integer("quantity_sold").notNull().default(0),
    revenueAmount: numeric("revenue_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discountImpactAmount: numeric("discount_impact_amount", {
      precision: 12,
      scale: 2,
    }),
  },
  (t) => ({
    closureIdx: index("daily_closure_item_lines_closure_id_idx").on(t.closureId),
    menuItemIdx: index("daily_closure_item_lines_menu_item_id_idx").on(
      t.menuItemId,
    ),
  }),
);

export const schema = {
  menuItems,
  restaurantTables,
  orders,
  orderItems,
  transactions,
  tableStatus,
  orderStatus,
  transactionType,
  dailyClosures,
  dailyClosureState,
  dailyClosureAdjustments,
  dailyClosurePaymentLines,
  dailyClosureItemLines,
  dailyClosureAdjustmentType,
  dailyClosurePaymentGroup,
};

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
export type DailyClosure = typeof dailyClosures.$inferSelect;
export type NewDailyClosure = typeof dailyClosures.$inferInsert;
export type DailyClosureAdjustment = typeof dailyClosureAdjustments.$inferSelect;
export type NewDailyClosureAdjustment = typeof dailyClosureAdjustments.$inferInsert;
export type DailyClosurePaymentLine = typeof dailyClosurePaymentLines.$inferSelect;
export type NewDailyClosurePaymentLine = typeof dailyClosurePaymentLines.$inferInsert;
export type DailyClosureItemLine = typeof dailyClosureItemLines.$inferSelect;
export type NewDailyClosureItemLine = typeof dailyClosureItemLines.$inferInsert;
export type DailyClosureStateRow = typeof dailyClosureState.$inferSelect;
export type NewDailyClosureStateRow = typeof dailyClosureState.$inferInsert;
