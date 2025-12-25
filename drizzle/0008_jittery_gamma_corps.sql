CREATE TABLE "restaurant_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"tax_rate" numeric(5, 4) DEFAULT '0.1000' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"business_hours" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "restaurant_settings_updated_at_idx" ON "restaurant_settings" USING btree ("updated_at");