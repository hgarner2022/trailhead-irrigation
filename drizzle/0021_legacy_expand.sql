ALTER TABLE "job" ALTER COLUMN "kind" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_alert" ADD COLUMN "job_id" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "legacy_pass_id" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "sold_on" date;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "quote_sent_on" date;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "quote_accepted_on" date;--> statement-breakpoint
CREATE UNIQUE INDEX "job_legacy_pass_id_unique" ON "job" USING btree ("legacy_pass_id") WHERE legacy_pass_id is not null;--> statement-breakpoint
-- Step 6 backfills. Every statement below is idempotent: a re-run changes nothing.
-- 1. The old pass id on its job, so every old link, token and Stripe metadata id keeps opening the pass.
update "job" j
set "legacy_pass_id" = sp."id"
from "season_pass" sp
where sp."job_id" = j."id" and j."legacy_pass_id" is null;--> statement-breakpoint
-- 2. The day each job was sold (Mountain time). A pending job is not sold yet and stays empty, so pending is still a fact; so does a job made below from a quote request (job_qr_), so a re-run leaves it empty.
update "job"
set "sold_on" = ("created_at" at time zone 'America/Denver')::date
where "sold_on" is null and "status" <> 'pending' and left("id", 7) <> 'job_qr_';--> statement-breakpoint
-- 3. Alerts and messages: the job on the alert, then every key that is an old pass id (or starts with one and an @) becomes the job id, unless that key is already taken.
update "admin_alert" a
set "job_id" = sp."job_id"
from "season_pass" sp
where sp."id" = a."pass_id" and a."job_id" is null;--> statement-breakpoint
update "admin_alert" a
set "key" = j."id" || substr(a."key", length(j."legacy_pass_id") + 1)
from "job" j
where j."legacy_pass_id" is not null
  and a."organization_id" = j."organization_id"
  and (a."key" = j."legacy_pass_id" or left(a."key", length(j."legacy_pass_id") + 1) = j."legacy_pass_id" || '@')
  and not exists (
    select 1 from "admin_alert" b
    where b."organization_id" = a."organization_id" and b."kind" = a."kind"
      and b."key" = j."id" || substr(a."key", length(j."legacy_pass_id") + 1)
  );--> statement-breakpoint
update "message_log" m
set "key" = j."id" || substr(m."key", length(j."legacy_pass_id") + 1)
from "job" j
where j."legacy_pass_id" is not null
  and m."organization_id" = j."organization_id"
  and m."kind" in ('purchase-confirmation', 'cancelled')
  and (m."key" = j."legacy_pass_id" or left(m."key", length(j."legacy_pass_id") + 1) = j."legacy_pass_id" || '@')
  and not exists (
    select 1 from "message_log" b
    where b."kind" = m."kind" and b."customer_id" = m."customer_id"
      and b."key" = j."id" || substr(m."key", length(j."legacy_pass_id") + 1)
  );--> statement-breakpoint
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
-- 6. Guard, then the index: two visits of one pass kind on one job would make the unique index fail, so say so first and abort the migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "visit" WHERE "kind" IN ('turn-on', 'inspection', 'blowout')
    GROUP BY "job_id", "kind" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'legacy_expand: two visits of one pass kind share a job';
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "visit_job_pass_kind_unique" ON "visit" USING btree ("job_id","kind") WHERE "visit"."kind" in ('turn-on', 'inspection', 'blowout');--> statement-breakpoint
-- 7. Deploy-window triggers. The OLD code (main) stays live after this migration is applied and keeps writing season_pass rows and job rows with kind and status set and no sold_on or legacy_pass_id. These four triggers backfill such rows at once, so the new code stays correct on them.
-- These four triggers exist only for the deploy window and are dropped by the migration that drops the legacy tables (step 6 push B).
-- Only the old code writes job.kind (the new code leaves it null, and the seed sets its own sold_on), so a job with a kind and no sold_on is an old-code sale. A pending job is not sold yet, and job_qr_ jobs (made above from quote requests) stay unsold.
CREATE OR REPLACE FUNCTION legacy_job_sold_on_insert() RETURNS trigger AS $fn$
BEGIN
  IF NEW."kind" IS NOT NULL AND NEW."sold_on" IS NULL AND NEW."status" <> 'pending' AND left(NEW."id", 7) <> 'job_qr_' THEN
    NEW."sold_on" := (now() at time zone 'America/Denver')::date;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_job_sold_on_insert ON "job";--> statement-breakpoint
CREATE TRIGGER legacy_job_sold_on_insert BEFORE INSERT ON "job" FOR EACH ROW EXECUTE FUNCTION legacy_job_sold_on_insert();--> statement-breakpoint
-- The old code activates a pass by moving its job's status off pending.
CREATE OR REPLACE FUNCTION legacy_job_sold_on_update() RETURNS trigger AS $fn$
BEGIN
  IF OLD."status" = 'pending' AND NEW."status" <> 'pending' AND NEW."sold_on" IS NULL THEN
    NEW."sold_on" := (now() at time zone 'America/Denver')::date;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_job_sold_on_update ON "job";--> statement-breakpoint
CREATE TRIGGER legacy_job_sold_on_update BEFORE UPDATE ON "job" FOR EACH ROW EXECUTE FUNCTION legacy_job_sold_on_update();--> statement-breakpoint
-- The old code makes a season_pass row after its job: the job learns the old pass id, and a cancelled pass cancels its job.
CREATE OR REPLACE FUNCTION legacy_season_pass_job_insert() RETURNS trigger AS $fn$
BEGIN
  UPDATE "job" SET "legacy_pass_id" = NEW."id" WHERE "id" = NEW."job_id" AND "legacy_pass_id" IS NULL;
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_season_pass_job_insert ON "season_pass";--> statement-breakpoint
CREATE TRIGGER legacy_season_pass_job_insert AFTER INSERT ON "season_pass" FOR EACH ROW EXECUTE FUNCTION legacy_season_pass_job_insert();--> statement-breakpoint
CREATE OR REPLACE FUNCTION legacy_season_pass_job_update() RETURNS trigger AS $fn$
BEGIN
  IF NEW."cancelled_at" IS NOT NULL THEN
    UPDATE "job" SET "cancelled_at" = NEW."cancelled_at" WHERE "id" = NEW."job_id" AND "cancelled_at" IS NULL;
  END IF;
  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_season_pass_job_update ON "season_pass";--> statement-breakpoint
CREATE TRIGGER legacy_season_pass_job_update AFTER UPDATE ON "season_pass" FOR EACH ROW EXECUTE FUNCTION legacy_season_pass_job_update();
