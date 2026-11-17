CREATE TABLE "line_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"service_id" text,
	"visit_id" text,
	"name" text NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"taxable" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_visit_id_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_item_job_idx" ON "line_item" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "line_item_visit_idx" ON "line_item" USING btree ("visit_id");--> statement-breakpoint
-- Backfill: one line per visit of a pass job (id line_<visit id>, named for the visit kind, priced at the visit's amount, cancelled with a cancelled or skipped visit as of the job's cancellation or the visit's last change) and one per one-off job (id line_<job id>, named for the job kind, priced at the job's price, cancelled with the job, on its earliest visit). The service is the visit's own when it has one of the matching kind, else the one service of that kind for the organization whose zone band fits the pass (the bookable one when a kind also has a quoted entry, as repair does); its description is copied to the line. Kinds compare as text: job_kind and visit_kind are different enums. A visit or job that already has a line is skipped, so a re-run inserts nothing.
INSERT INTO "line_item" ("id", "organization_id", "job_id", "service_id", "visit_id", "name", "description", "quantity", "unit_price", "taxable", "cancelled_at", "created_at")
SELECT 'line_' || v."id", v."organization_id", v."job_id", s."id", v."id",
  CASE v."kind"::text WHEN 'turn-on' THEN 'Spring turn-on' WHEN 'inspection' THEN 'Mid-season inspection' WHEN 'blowout' THEN 'Fall blowout' ELSE 'Other' END,
  s."description", 1, v."amount", false,
  CASE WHEN v."status" IN ('cancelled', 'skipped') THEN COALESCE(j."cancelled_at", v."updated_at") END, v."created_at"
FROM "visit" v
JOIN "job" j ON j."id" = v."job_id" AND j."kind"::text = 'pass'
LEFT JOIN "season_pass" p ON p."job_id" = v."job_id"
LEFT JOIN "service" vs ON vs."id" = v."service_id" AND vs."kind"::text = v."kind"::text
LEFT JOIN LATERAL (
  SELECT (array_agg(c."id" ORDER BY c."quote_only", c."key"))[1] AS "id", count(*) AS "n", count(*) FILTER (WHERE NOT c."quote_only") AS "offered"
  FROM "service" c
  WHERE c."organization_id" = v."organization_id" AND c."kind"::text = v."kind"::text
    AND (c."min_zones" IS NULL OR p."zones" IS NULL OR p."zones" >= c."min_zones") AND (c."max_zones" IS NULL OR p."zones" IS NULL OR p."zones" <= c."max_zones")
) m ON vs."id" IS NULL AND (m."n" = 1 OR m."offered" = 1)
LEFT JOIN "service" s ON s."id" = COALESCE(vs."id", m."id")
WHERE NOT EXISTS (SELECT 1 FROM "line_item" l WHERE l."visit_id" = v."id");--> statement-breakpoint
INSERT INTO "line_item" ("id", "organization_id", "job_id", "service_id", "visit_id", "name", "description", "quantity", "unit_price", "taxable", "cancelled_at", "created_at")
SELECT 'line_' || j."id", j."organization_id", j."id", s."id", f."id",
  CASE j."kind"::text WHEN 'repair' THEN 'Repair' WHEN 'install' THEN 'Installation' ELSE 'Other' END,
  s."description", 1, COALESCE(j."price", 0), false, j."cancelled_at", j."created_at"
FROM "job" j
LEFT JOIN LATERAL (SELECT v."id", v."service_id" FROM "visit" v WHERE v."job_id" = j."id" ORDER BY v."created_at", v."id" LIMIT 1) f ON true
LEFT JOIN "service" vs ON vs."id" = f."service_id" AND vs."kind"::text = j."kind"::text
LEFT JOIN LATERAL (
  SELECT (array_agg(c."id" ORDER BY c."quote_only", c."key"))[1] AS "id", count(*) AS "n", count(*) FILTER (WHERE NOT c."quote_only") AS "offered"
  FROM "service" c
  WHERE c."organization_id" = j."organization_id" AND c."kind"::text = j."kind"::text
) m ON vs."id" IS NULL AND (m."n" = 1 OR m."offered" = 1)
LEFT JOIN "service" s ON s."id" = COALESCE(vs."id", m."id")
WHERE j."kind"::text <> 'pass' AND NOT EXISTS (SELECT 1 FROM "line_item" l WHERE l."job_id" = j."id");