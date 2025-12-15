CREATE TABLE "daily_closure_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"current_period_start_at" timestamp NOT NULL,
	"next_sequence_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "daily_closures_business_date_uniq";--> statement-breakpoint
ALTER TABLE "daily_closures" ADD COLUMN "sequence_no" integer;--> statement-breakpoint
ALTER TABLE "daily_closures" ADD COLUMN "period_start_at" timestamp;--> statement-breakpoint
ALTER TABLE "daily_closures" ADD COLUMN "period_end_at" timestamp;--> statement-breakpoint
WITH ranked AS (
	SELECT
		"id",
		"business_date",
		"created_at",
		row_number() OVER (ORDER BY "business_date" ASC, "created_at" ASC, "id" ASC) AS "seq_no"
	FROM "daily_closures"
)
UPDATE "daily_closures" AS d
SET
	"sequence_no" = COALESCE(d."sequence_no", ranked."seq_no"),
	"period_start_at" = COALESCE(d."period_start_at", ranked."business_date"::timestamp),
	"period_end_at" = COALESCE(d."period_end_at", d."locked_at", d."created_at", (ranked."business_date" + INTERVAL '1 day')::timestamp)
FROM ranked
WHERE d."id" = ranked."id";--> statement-breakpoint
ALTER TABLE "daily_closures" ALTER COLUMN "sequence_no" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closures" ALTER COLUMN "period_start_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_closures" ALTER COLUMN "period_end_at" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closures_sequence_no_uniq" ON "daily_closures" USING btree ("sequence_no");--> statement-breakpoint
CREATE INDEX "daily_closures_period_start_at_idx" ON "daily_closures" USING btree ("period_start_at");--> statement-breakpoint
CREATE INDEX "daily_closures_period_end_at_idx" ON "daily_closures" USING btree ("period_end_at");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
INSERT INTO "daily_closure_state" ("id", "current_period_start_at", "next_sequence_no", "updated_at")
SELECT
	1,
	COALESCE((SELECT max("period_end_at") FROM "daily_closures"), now()),
	COALESCE((SELECT max("sequence_no") FROM "daily_closures"), 0) + 1,
	now()
ON CONFLICT ("id") DO NOTHING;
