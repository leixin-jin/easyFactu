ALTER TABLE "order_items" ADD COLUMN "paid_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL;