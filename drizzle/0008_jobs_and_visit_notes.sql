CREATE TYPE "public"."job_kind" AS ENUM('pass', 'repair', 'install', 'other');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'active', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"property_id" text NOT NULL,
	"kind" "job_kind" NOT NULL,
	"status" "job_status" DEFAULT 'active' NOT NULL,
	"price" integer,
	"source" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit" DROP CONSTRAINT "visit_one_parent";--> statement-breakpoint
ALTER TABLE "season_pass" ADD COLUMN "job_id" text;--> statement-breakpoint
ALTER TABLE "visit" ADD COLUMN "job_id" text;--> statement-breakpoint
ALTER TABLE "visit" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_org_customer_idx" ON "job" USING btree ("organization_id","customer_id");--> statement-breakpoint
-- Backfill: one job per pass (id job_<pass id>, kind pass, price the pass total) and one per booking (id job_<booking id>).
INSERT INTO "job" ("id", "organization_id", "customer_id", "property_id", "kind", "status", "price", "source", "created_at", "cancelled_at")
SELECT 'job_' || p."id", p."organization_id", p."customer_id", p."property_id", 'pass',
  CASE p."status" WHEN 'pending' THEN 'pending' WHEN 'active' THEN 'active' WHEN 'cancelled' THEN 'cancelled' ELSE 'done' END::"job_status",
  (SELECT COALESCE(SUM(v."amount"), 0) FROM "visit" v WHERE v."pass_id" = p."id" AND v."status" <> 'cancelled'),
  'checkout', p."created_at", p."cancelled_at"
FROM "season_pass" p;--> statement-breakpoint
INSERT INTO "job" ("id", "organization_id", "customer_id", "property_id", "kind", "status", "price", "source", "notes", "created_at")
SELECT 'job_' || b."id", b."organization_id", b."customer_id", b."property_id",
  COALESCE((SELECT CASE v."kind" WHEN 'repair' THEN 'repair' WHEN 'install' THEN 'install' ELSE 'other' END FROM "visit" v WHERE v."booking_id" = b."id" ORDER BY v."created_at" LIMIT 1), 'other')::"job_kind",
  CASE b."status" WHEN 'cancelled' THEN 'cancelled' ELSE 'active' END::"job_status",
  NULLIF((SELECT COALESCE(SUM(v."amount"), 0) FROM "visit" v WHERE v."booking_id" = b."id" AND v."status" <> 'cancelled'), 0),
  CASE b."source" WHEN 'admin' THEN 'office' ELSE 'site' END, b."notes", b."created_at"
FROM "booking" b;--> statement-breakpoint
UPDATE "season_pass" SET "job_id" = 'job_' || "id";--> statement-breakpoint
UPDATE "visit" SET "job_id" = CASE WHEN "pass_id" IS NOT NULL THEN 'job_' || "pass_id" ELSE 'job_' || "booking_id" END;--> statement-breakpoint
ALTER TABLE "season_pass" ALTER COLUMN "job_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "visit" ALTER COLUMN "job_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "season_pass" ADD CONSTRAINT "season_pass_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit" ADD CONSTRAINT "visit_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;
