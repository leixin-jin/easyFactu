CREATE TYPE "public"."daily_closure_adjustment_type" AS ENUM('fee', 'rounding', 'other');--> statement-breakpoint
CREATE TYPE "public"."daily_closure_payment_group" AS ENUM('cash', 'card', 'platform', 'other');--> statement-breakpoint
CREATE TABLE "daily_closure_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closure_id" uuid NOT NULL,
	"type" "daily_closure_adjustment_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"note" text NOT NULL,
	"payment_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_closure_item_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closure_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"name_snapshot" text NOT NULL,
	"category_snapshot" text NOT NULL,
	"quantity_sold" integer DEFAULT 0 NOT NULL,
	"revenue_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_impact_amount" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "daily_closure_payment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closure_id" uuid NOT NULL,
	"payment_method" text NOT NULL,
	"payment_group" "daily_closure_payment_group" NOT NULL,
	"expected_amount" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_date" date NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0.1000' NOT NULL,
	"gross_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"refund_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"void_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_closure_adjustments" ADD CONSTRAINT "daily_closure_adjustments_closure_id_daily_closures_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."daily_closures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closure_item_lines" ADD CONSTRAINT "daily_closure_item_lines_closure_id_daily_closures_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."daily_closures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closure_item_lines" ADD CONSTRAINT "daily_closure_item_lines_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closure_payment_lines" ADD CONSTRAINT "daily_closure_payment_lines_closure_id_daily_closures_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."daily_closures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_closure_adjustments_closure_id_idx" ON "daily_closure_adjustments" USING btree ("closure_id");--> statement-breakpoint
CREATE INDEX "daily_closure_item_lines_closure_id_idx" ON "daily_closure_item_lines" USING btree ("closure_id");--> statement-breakpoint
CREATE INDEX "daily_closure_item_lines_menu_item_id_idx" ON "daily_closure_item_lines" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "daily_closure_payment_lines_closure_id_idx" ON "daily_closure_payment_lines" USING btree ("closure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closure_payment_lines_closure_payment_method_uniq" ON "daily_closure_payment_lines" USING btree ("closure_id","payment_method");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closures_business_date_uniq" ON "daily_closures" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "orders_closed_at_idx" ON "orders" USING btree ("closed_at");