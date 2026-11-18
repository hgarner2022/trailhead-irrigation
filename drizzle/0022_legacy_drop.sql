-- Step 6, push B: every DROP of the legacy tables, columns, indexes, foreign keys and enum types. Irreversible, so the guards below come first; any of them raising aborts the whole migration (it runs in one transaction) and nothing is dropped.
-- 0. Repair of whatever the old code wrote after migration 0021 and before this one; each statement is idempotent (copied verbatim from migration 0021: re-running changes nothing). The old code stays live between push A and the merge, so a pass, a visit, a booking, a quote request or a note may have been written without its new-model row; the guards below then check what is left.
-- 1. The old pass id on its job, so every old link, token and Stripe metadata id keeps opening the pass.
update "job" j
set "legacy_pass_id" = sp."id"
from "season_pass" sp
where sp."job_id" = j."id" and j."legacy_pass_id" is null;--> statement-breakpoint
-- 2. The day each job was sold (Mountain time). A pending job is not sold yet and stays empty, so pending is still a fact; so does a job made below from a quote request (job_qr_), so a re-run leaves it empty.
update "job"
set "sold_on" = ("created_at" at time zone 'America/Denver')::date
where "sold_on" is null and "status" <> 'pending' and left("id", 7) <> 'job_qr_';--> statement-breakpoint
update "admin_alert" a
set "job_id" = sp."job_id"
from "season_pass" sp
where sp."id" = a."pass_id" and a."job_id" is null;--> statement-breakpoint
-- 4a. A line for every priced visit that has none (id line_<visit id>, named with the words of LINE_NAMES, cancelled with a cancelled or skipped visit or a cancelled job whose visit was not done).
insert into "line_item" ("id", "organization_id", "job_id", "service_id", "visit_id", "name", "description", "quantity", "unit_price", "taxable", "cancelled_at", "created_at")
select 'line_' || v."id", v."organization_id", v."job_id", s."id", v."id",
  case v."kind"::text
    when 'turn-on' then 'Spring turn-on'
    when 'inspection' then 'Mid-season inspection'
    when 'blowout' then 'Fall blowout'
    when 'repair' then 'Repair'
    when 'install' then 'Installation'
    when 'rachio-install' then 'Rachio controller install'
    else coalesce(s."name", 'Other')
  end,
  s."description", 1, v."amount", coalesce(s."taxable", false),
  case when v."status" in ('cancelled', 'skipped') or (j."cancelled_at" is not null and v."status" <> 'completed') then coalesce(j."cancelled_at", v."updated_at") end,
  v."created_at"
from "visit" v
join "job" j on j."id" = v."job_id"
left join "service" s on s."id" = v."service_id"
where v."amount" > 0
  and not exists (select 1 from "line_item" l where l."visit_id" = v."id")
on conflict ("id") do nothing;--> statement-breakpoint
-- 4b. A succeeded payment row for every visit that was charged but has no succeeded payment on its job (id ch_legacy_<visit id>, the next free attempt, the payment intent only when no other row has it).
insert into "charge" ("id", "organization_id", "job_id", "customer_id", "visit_id", "paid_on", "attempt", "amount", "status", "stripe_payment_intent_id", "method", "created_at")
select 'ch_legacy_' || v."id", v."organization_id", v."job_id", v."customer_id", v."id",
  (v."charged_at" at time zone 'America/Denver')::date,
  coalesce((select max(c0."attempt") from "charge" c0 where c0."visit_id" = v."id"), 0) + 1,
  v."amount", 'succeeded',
  case when v."stripe_payment_intent_id" is not null and not exists (select 1 from "charge" c1 where c1."stripe_payment_intent_id" = v."stripe_payment_intent_id") then v."stripe_payment_intent_id" end,
  'card_on_file', v."charged_at"
from "visit" v
where v."charged_at" is not null and v."amount" > 0
  and not exists (
    select 1 from "charge" c
    where c."job_id" = v."job_id" and c."status" = 'succeeded' and c."refunds_payment_id" is null and c."amount" > 0
  )
on conflict ("id") do nothing;--> statement-breakpoint
-- 4c. A job for any booking that has none (none expected: migration 0008 made them all).
insert into "job" ("id", "organization_id", "customer_id", "property_id", "kind", "status", "price", "source", "notes", "sold_on", "created_at", "updated_at")
select 'job_' || b."id", b."organization_id", b."customer_id", b."property_id",
  coalesce((select case v."kind"::text when 'repair' then 'repair' when 'install' then 'install' else 'other' end from "visit" v where v."booking_id" = b."id" order by v."created_at", v."id" limit 1), 'other')::"job_kind",
  case b."status" when 'cancelled' then 'cancelled' else 'active' end::"job_status",
  null,
  case b."source" when 'admin' then 'office' else 'site' end, b."notes",
  (b."created_at" at time zone 'America/Denver')::date, b."created_at", b."updated_at"
from "booking" b
where not exists (select 1 from "job" j where j."id" = 'job_' || b."id")
on conflict ("id") do nothing;--> statement-breakpoint
-- 4d. A quote request is a job that needs a quote. First a property for a request whose customer has none ("Address needed", the notes carry the real words).
insert into "property" ("id", "organization_id", "customer_id", "address", "town")
select distinct on (q."customer_id") 'prop_qr_' || q."id", q."organization_id", q."customer_id", 'Address needed', 'Erie'
from "quote_request" q
where q."property_id" is null
  and not exists (select 1 from "job" j where j."id" = 'job_qr_' || q."id")
  and not exists (select 1 from "property" p where p."customer_id" = q."customer_id")
order by q."customer_id", q."created_at", q."id"
on conflict ("id") do nothing;--> statement-breakpoint
-- 4e. The job: the request's property, else the customer's newest. Sold day empty; a quoted request has its quote sent on the day it was updated; an archived one is cancelled then. The kind is written for the code that still reads it.
insert into "job" ("id", "organization_id", "customer_id", "property_id", "kind", "status", "price", "source", "sold_on", "quote_sent_on", "cancelled_at", "created_at", "updated_at")
select 'job_qr_' || q."id", q."organization_id", q."customer_id",
  coalesce(q."property_id", (select p."id" from "property" p where p."customer_id" = q."customer_id" order by p."created_at" desc, p."id" desc limit 1)),
  (case s."kind"::text when 'repair' then 'repair' when 'install' then 'install' else 'other' end)::"job_kind",
  (case q."status" when 'archived' then 'cancelled' else 'active' end)::"job_status",
  null, 'site', null,
  case when q."status" = 'quoted' then (q."updated_at" at time zone 'America/Denver')::date end,
  case when q."status" = 'archived' then q."updated_at" end,
  q."created_at", q."updated_at"
from "quote_request" q
left join "service" s on s."id" = q."service_id"
where not exists (select 1 from "job" j where j."id" = 'job_qr_' || q."id")
  and coalesce(q."property_id", (select p."id" from "property" p where p."customer_id" = q."customer_id" order by p."created_at" desc, p."id" desc limit 1)) is not null
on conflict ("id") do nothing;--> statement-breakpoint
-- 4f. Its one unpriced line (the service's name, the notes as the description, taxable as the service says) and its job.requested event.
insert into "line_item" ("id", "organization_id", "job_id", "service_id", "visit_id", "name", "description", "quantity", "unit_price", "taxable", "cancelled_at", "created_at")
select 'line_job_qr_' || q."id", q."organization_id", 'job_qr_' || q."id", s."id", null,
  coalesce(s."name", 'Other'), q."notes", 1, 0, coalesce(s."taxable", false),
  case when q."status" = 'archived' then q."updated_at" end, q."created_at"
from "quote_request" q
join "job" j on j."id" = 'job_qr_' || q."id"
left join "service" s on s."id" = q."service_id"
where not exists (select 1 from "line_item" l where l."job_id" = j."id")
on conflict ("id") do nothing;--> statement-breakpoint
insert into "event" ("id", "organization_id", "about", "about_id", "customer_id", "job_id", "visit_id", "kind", "detail", "who", "at")
select 'evt_qr_' || q."id", q."organization_id", 'job', j."id", q."customer_id", j."id", null, 'job.requested',
  jsonb_strip_nulls(jsonb_build_object('source', 'site', 'notes', q."notes", 'serviceId', q."service_id", 'status', q."status")),
  'system', q."created_at"
from "quote_request" q
join "job" j on j."id" = 'job_qr_' || q."id"
on conflict ("id") do nothing;--> statement-breakpoint
-- 5. Notes typed since migration 0020: one note event per non-blank visit.notes or job.notes with no note event of the same text under that record (a visit's note may be an event about its job that carries the visit; a job's note may be its visit's).
insert into "event" ("id", "organization_id", "about", "about_id", "customer_id", "job_id", "visit_id", "kind", "detail", "who", "at")
select 'evt_note2_visit_' || v."id", v."organization_id", 'visit', v."id", v."customer_id", v."job_id", v."id", 'note', jsonb_build_object('text', v."notes"), 'system', v."updated_at"
from "visit" v
where v."notes" is not null and trim(v."notes") <> ''
  and not exists (
    select 1 from "event" e
    where e."organization_id" = v."organization_id" and e."kind" = 'note' and e."visit_id" = v."id" and trim(e."detail"->>'text') = trim(v."notes")
  )
on conflict ("id") do nothing;--> statement-breakpoint
insert into "event" ("id", "organization_id", "about", "about_id", "customer_id", "job_id", "visit_id", "kind", "detail", "who", "at")
select 'evt_note2_job_' || j."id", j."organization_id", 'job', j."id", j."customer_id", j."id", null, 'note', jsonb_build_object('text', j."notes"), 'system', j."updated_at"
from "job" j
where j."notes" is not null and trim(j."notes") <> ''
  and not exists (
    select 1 from "event" e
    where e."organization_id" = j."organization_id" and e."kind" = 'note' and e."job_id" = j."id" and trim(e."detail"->>'text') = trim(j."notes")
  )
  and not exists (select 1 from "visit" v where v."job_id" = j."id" and trim(v."notes") = trim(j."notes"))
on conflict ("id") do nothing;--> statement-breakpoint
-- 1. Guard 1: every season_pass row has its job, and the job remembers the old pass id (so every old link, token and Stripe metadata id keeps opening the pass).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "season_pass" sp
  WHERE NOT EXISTS (SELECT 1 FROM "job" j WHERE j."legacy_pass_id" = sp."id");
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 1: % season_pass row(s) have no job whose legacy_pass_id equals their id', n;
  END IF;
END $$;--> statement-breakpoint
-- 1b. Guard 1b: dropping season_pass destroys its status, so a cancelled pass must already be a cancelled job.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "season_pass" sp
  WHERE sp."status" = 'cancelled'
    AND NOT EXISTS (SELECT 1 FROM "job" j WHERE j."legacy_pass_id" = sp."id" AND j."cancelled_at" IS NOT NULL);
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 1b: % cancelled season_pass row(s) have a job with no cancelled_at', n;
  END IF;
END $$;--> statement-breakpoint
-- 1c. Guard 1c: an active pass must already be a sold job.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "season_pass" sp
  WHERE sp."status" = 'active'
    AND NOT EXISTS (SELECT 1 FROM "job" j WHERE j."legacy_pass_id" = sp."id" AND j."sold_on" IS NOT NULL);
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 1c: % active season_pass row(s) have a job with no sold_on', n;
  END IF;
END $$;--> statement-breakpoint
-- 2. Guard 2a: every visit that was charged (charged_at set, amount above zero) has a succeeded, non-refund payment on its job.
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
-- 3. Guard 2b: every priced visit (amount above zero) has a line item, cancelled or not.
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
-- 4. Guard 3: every booking has its job (job_<id>) and every quote request has its job (job_qr_<id>).
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
-- 5. Guard 4: every admin_user is a person of the same organization with the same email (compared in lower case).
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
-- 6. Guard 5: every pass_change row has its event: the one migration 0020 copied (evt_pc_<id>), or, for a row written since step 5, the event recordChange wrote beside it (same organization and customer, within thirty seconds (pass_change.at is the database now() and the event's at is the request time, so a slow request must not abort the migration)).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "pass_change" pc
  WHERE NOT EXISTS (SELECT 1 FROM "event" e WHERE e."id" = 'evt_pc_' || pc."id")
    AND NOT EXISTS (
      SELECT 1 FROM "event" e
      WHERE e."organization_id" = pc."organization_id" AND e."customer_id" = pc."customer_id"
        AND e."at" BETWEEN pc."at" - interval '30 seconds' AND pc."at" + interval '30 seconds'
    );
  IF n > 0 THEN
    RAISE EXCEPTION 'legacy_drop guard 5: % pass_change row(s) have no matching event', n;
  END IF;
END $$;--> statement-breakpoint
-- 7. Guard 6: every non-blank visit note and job note is a note event of that text about that record (compared trimmed).
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
-- 8. Report only (never an exception): jobs that are no pass, hold no line and no visit, and did not come from a quote request. A job's kind is derived now, so such a job has nothing to derive it from.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "job" j
  WHERE j."season" IS NULL AND left(j."id", 7) <> 'job_qr_'
    AND NOT EXISTS (SELECT 1 FROM "line_item" l WHERE l."job_id" = j."id")
    AND NOT EXISTS (SELECT 1 FROM "visit" v WHERE v."job_id" = j."id");
  RAISE NOTICE 'legacy_drop: % job(s) have no season, no line and no visit and are not quote jobs', n;
END $$;--> statement-breakpoint
-- 9. The four deploy-window triggers of migration 0021 and their functions, dropped after the guards so the lock they take on job and season_pass is held only briefly, and before the drops below because they read season_pass and the job columns dropped there.
DROP TRIGGER IF EXISTS legacy_job_sold_on_insert ON "job";--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_job_sold_on_update ON "job";--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_season_pass_job_insert ON "season_pass";--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_season_pass_job_update ON "season_pass";--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_job_sold_on_insert();--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_job_sold_on_update();--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_season_pass_job_insert();--> statement-breakpoint
DROP FUNCTION IF EXISTS legacy_season_pass_job_update();--> statement-breakpoint
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
