CREATE UNIQUE INDEX "uniq_open_order_per_table" ON "orders" USING btree ("table_id") WHERE "orders"."status" = 'open';--> statement-breakpoint
ALTER TABLE "menu_items" DROP COLUMN "cost";--> statement-breakpoint
ALTER TABLE "menu_items" DROP COLUMN "popular";--> statement-breakpoint
ALTER TABLE "menu_items" DROP COLUMN "spicy";--> statement-breakpoint
ALTER TABLE "menu_items" DROP COLUMN "allergens";--> statement-breakpoint
ALTER TABLE "menu_items" DROP COLUMN "sales";--> statement-breakpoint
ALTER TABLE "menu_items" DROP COLUMN "revenue";