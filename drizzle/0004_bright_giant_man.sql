ALTER TABLE IF EXISTS "staff" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "staff" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "restaurant_tables" DROP CONSTRAINT IF EXISTS "restaurant_tables_waiter_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN IF EXISTS "staff_id";--> statement-breakpoint
ALTER TABLE "restaurant_tables" DROP COLUMN IF EXISTS "waiter_id";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."staff_status";
