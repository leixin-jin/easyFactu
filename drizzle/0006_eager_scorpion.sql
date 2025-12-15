CREATE TABLE "daily_closure_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"current_period_start_at" timestamp NOT NULL,
	"next_sequence_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "daily_closures_business_date_uniq";--> statement-breakpoint
ALTER TABLE "daily_closures" ALTER COLUMN "business_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closures" ADD COLUMN "sequence_no" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closures" ADD COLUMN "period_start_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closures" ADD COLUMN "period_end_at" timestamp NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closures_sequence_no_uniq" ON "daily_closures" USING btree ("sequence_no");--> statement-breakpoint
CREATE INDEX "daily_closures_period_start_at_idx" ON "daily_closures" USING btree ("period_start_at");--> statement-breakpoint
CREATE INDEX "daily_closures_period_end_at_idx" ON "daily_closures" USING btree ("period_end_at");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");