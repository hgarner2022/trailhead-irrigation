-- Step 6, push B: every DROP of the legacy tables, columns, indexes, foreign keys and enum types. Irreversible, so the guards below come first; any of them raising aborts the whole migration (it runs in one transaction) and nothing is dropped.
-- 1. The four deploy-window triggers of migration 0021 and their functions. They read season_pass and the job columns dropped below, so they go first.
DROP TRIGGER IF EXISTS legacy_job_sold_on_insert ON "job";--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_job_sold_on_update ON "job";--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_season_pass_job_insert ON "season_pass";--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_season_pass_job_update ON "season_pass";--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_job_sold_on_insert();--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_job_sold_on_update();--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_season_pass_job_insert();--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_season_pass_job_update();--> statement-breakpoint
-- 2. Guard 1: every season_pass row has its job, and the job remembers the old pass id (so every old link, token and Stripe metadata id keeps opening the pass).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "season_pass" sp
  WHERE NOT EXISTS (SELECT 1 FROM "job" j WHERE j."legacy_pass_id" = sp."id");
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 1: % season_pass row(s) have no job whose legacy_pass_id equals their id', n;
  END IF;
END $$;--> statement-breakpoint
-- 3. Guard 2a: every visit that was charged (charged_at set, amount above zero) has a succeeded, non-refund payment on its job.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "visit" v
  WHERE v."charged_at" IS NOT NULL AND v."amount" > 0
    AND NOT EXISTS (
      SELECT 1 FROM "charge" c
      WHERE c."job_id" = v."job_id" AND c."status" = 'succeeded' AND c."refunds_payment_id" IS NULL AND c."amount" > 0
    );
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 2: % charged visit(s) have no succeeded payment on their job', n;
  END IF;
END $$;--> statement-breakpoint
-- 4. Guard 2b: every priced visit (amount above zero) has a line item, cancelled or not.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "visit" v
  WHERE v."amount" > 0
    AND NOT EXISTS (SELECT 1 FROM "line_item" l WHERE l."visit_id" = v."id");
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 2: % priced visit(s) have no line item', n;
  END IF;
END $$;--> statement-breakpoint
-- 5. Guard 3: every booking has its job (job_<id>) and every quote request has its job (job_qr_<id>).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "booking" b
  WHERE NOT EXISTS (SELECT 1 FROM "job" j WHERE j."id" = 'job_' || b."id");
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 3: % booking(s) have no job with id job_<booking id>', n;
  END IF;
  SELECT count(*) INTO n FROM "quote_request" q
  WHERE NOT EXISTS (SELECT 1 FROM "job" j WHERE j."id" = 'job_qr_' || q."id");
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 3: % quote request(s) have no job with id job_qr_<request id>', n;
  END IF;
END $$;--> statement-breakpoint
-- 6. Guard 4: every admin_user is a person of the same organization with the same email (compared in lower case).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "admin_user" a
  WHERE NOT EXISTS (
    SELECT 1 FROM "person" p
    WHERE p."organization_id" = a."organization_id" AND lower(p."email") = lower(a."email")
  );
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 4: % admin user(s) have no person with their email in their organization', n;
  END IF;
END $$;--> statement-breakpoint
-- 7. Guard 5: every pass_change row has its event: the one migration 0020 copied (evt_pc_<id>), or, for a row written since step 5, the event recordChange wrote beside it (same organization and customer, within five seconds).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "pass_change" pc
  WHERE NOT EXISTS (SELECT 1 FROM "event" e WHERE e."id" = 'evt_pc_' || pc."id")
    AND NOT EXISTS (
      SELECT 1 FROM "event" e
      WHERE e."organization_id" = pc."organization_id" AND e."customer_id" = pc."customer_id"
        AND e."at" BETWEEN pc."at" - interval '5 seconds' AND pc."at" + interval '5 seconds'
    );
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 5: % pass_change row(s) have no matching event', n;
  END IF;
END $$;--> statement-breakpoint
-- 8. Guard 6: every non-blank visit note and job note is a note event of that text about that record (compared trimmed).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "visit" v
  WHERE v."notes" IS NOT NULL AND trim(v."notes") <> ''
    AND NOT EXISTS (
      SELECT 1 FROM "event" e
      WHERE e."organization_id" = v."organization_id" AND e."kind" = 'note' AND e."visit_id" = v."id"
        AND trim(e."detail"->>'text') = trim(v."notes")
    );
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 6: % visit note(s) have no note event with their text', n;
  END IF;
  SELECT count(*) INTO n FROM "job" j
  WHERE j."notes" IS NOT NULL AND trim(j."notes") <> ''
    AND NOT EXISTS (
      SELECT 1 FROM "event" e
      WHERE e."organization_id" = j."organization_id" AND e."kind" = 'note' AND e."job_id" = j."id"
        AND trim(e."detail"->>'text') = trim(j."notes")
    );
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 6: % job note(s) have no note event with their text', n;
  END IF;
END $$;--> statement-breakpoint
-- 9. Report only (never an exception): jobs that are no pass, hold no line and no visit, and did not come from a quote request. A job's kind is derived now, so such a job has nothing to derive it from.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "job" j
  WHERE j."season" IS NULL AND left(j."id", 7) <> 'job_qr_'
    AND NOT EXISTS (SELECT 1 FROM "line_item" l WHERE l."job_id" = j."id")
    AND NOT EXISTS (SELECT 1 FROM "visit" v WHERE v."job_id" = j."id");
  RAISE NOTICE 'legacy_drop: % job(s) have no season, no line and no visit and are not quote jobs', n;
END $$;--> statement-breakpoint
-- The drops, generated by drizzle-kit and put in dependency order: the foreign keys that point at the dying tables, the old index, the columns, the tables, then the enum types nothing uses any more.
ALTER TABLE "admin_alert" DROP CONSTRAINT "admin_alert_pass_id_season_pass_id_fk";
--> statement-breakpoint
ALTER TABLE "charge" DROP CONSTRAINT "charge_pass_id_season_pass_id_fk";
--> statement-breakpoint
ALTER TABLE "jobber_visit" DROP CONSTRAINT "jobber_visit_truck_id_truck_id_fk";
--> statement-breakpoint
ALTER TABLE "visit" DROP CONSTRAINT "visit_pass_id_season_pass_id_fk";
--> statement-breakpoint
ALTER TABLE "visit" DROP CONSTRAINT "visit_booking_id_booking_id_fk";
--> statement-breakpoint
ALTER TABLE "visit" DROP CONSTRAINT "visit_truck_id_truck_id_fk";
--> statement-breakpoint
DROP INDEX "visit_pass_kind_unique";--> statement-breakpoint
ALTER TABLE "admin_alert" DROP COLUMN "pass_id";--> statement-breakpoint
ALTER TABLE "charge" DROP COLUMN "pass_id";--> statement-breakpoint
ALTER TABLE "job" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "job" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "job" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "job" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "jobber_visit" DROP COLUMN "truck_id";--> statement-breakpoint
ALTER TABLE "person" DROP COLUMN "legacy_truck_id";--> statement-breakpoint
ALTER TABLE "visit" DROP COLUMN "pass_id";--> statement-breakpoint
ALTER TABLE "visit" DROP COLUMN "booking_id";--> statement-breakpoint
ALTER TABLE "visit" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "visit" DROP COLUMN "truck_id";--> statement-breakpoint
ALTER TABLE "visit" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "visit" DROP COLUMN "charged_at";--> statement-breakpoint
ALTER TABLE "visit" DROP COLUMN "stripe_payment_intent_id";--> statement-breakpoint
ALTER TABLE "admin_user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pass_change" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quote_request" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "season_pass" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "truck" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "admin_user" CASCADE;--> statement-breakpoint
DROP TABLE "booking" CASCADE;--> statement-breakpoint
DROP TABLE "pass_change" CASCADE;--> statement-breakpoint
DROP TABLE "quote_request" CASCADE;--> statement-breakpoint
DROP TABLE "season_pass" CASCADE;--> statement-breakpoint
DROP TABLE "truck" CASCADE;--> statement-breakpoint
DROP TYPE "public"."admin_role";--> statement-breakpoint
DROP TYPE "public"."job_kind";--> statement-breakpoint
DROP TYPE "public"."job_status";--> statement-breakpoint
DROP TYPE "public"."pass_status";
