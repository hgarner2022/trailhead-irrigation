CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"about" text NOT NULL,
	"about_id" text NOT NULL,
	"customer_id" text,
	"job_id" text,
	"visit_id" text,
	"kind" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"who" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_about_idx" ON "event" USING btree ("organization_id","about","about_id","at");--> statement-breakpoint
CREATE INDEX "event_customer_idx" ON "event" USING btree ("organization_id","customer_id","at");--> statement-breakpoint
CREATE INDEX "event_job_idx" ON "event" USING btree ("organization_id","job_id","at");--> statement-breakpoint
CREATE INDEX "event_visit_idx" ON "event" USING btree ("organization_id","visit_id","at");--> statement-breakpoint
insert into "event" ("id", "organization_id", "about", "about_id", "customer_id", "job_id", "visit_id", "kind", "detail", "who", "at", "created_at", "updated_at")
select
  'evt_pc_' || x."id",
  x."organization_id",
  case when x."visit_id" is not null and left(x."new_kind", 6) = 'visit.' then 'visit' when x."job_id" is not null then 'job' else 'customer' end,
  case when x."visit_id" is not null and left(x."new_kind", 6) = 'visit.' then x."visit_id" when x."job_id" is not null then x."job_id" else x."customer_id" end,
  x."customer_id",
  x."job_id",
  x."visit_id",
  x."new_kind",
  case x."kind" when 'renewed' then x."detail" || '{"source":"renewal"}'::jsonb when 'sold' then x."detail" || '{"source":"office"}'::jsonb else x."detail" end,
  x."by_principal",
  x."at",
  x."created_at",
  x."updated_at"
from (
  select pc.*, coalesce(sp."job_id", v."job_id") as "job_id",
    case pc."kind"
      when 'consent-snapshot' then 'consent'
      when 'renewed' then 'job.sold'
      when 'sold' then 'job.sold'
      when 'visit-created' then 'job.sold'
      when 'day-picked' then 'visit.moved'
      when 'done-undone' then 'visit.undone'
      when 'skipped' then 'visit.skipped'
      when 'cancelled' then 'pass.cancelled'
      when 'preference' then 'pass.preference-changed'
      when 'inspection-added' then 'pass.inspection-added'
      when 'visit-edited' then 'visit.edited'
      when 'visit-cancelled' then 'visit.cancelled'
      when 'move-requested' then 'visit.move-requested'
      when 'not-done' then 'visit.not-done'
      when 'day-filled' then 'visit.day-filled'
      else pc."kind"
    end as "new_kind"
  from "pass_change" pc
  left join "visit" v on v."id" = pc."visit_id"
  left join "season_pass" sp on sp."id" = pc."pass_id"
) x
on conflict ("id") do nothing;--> statement-breakpoint
insert into "event" ("id", "organization_id", "about", "about_id", "customer_id", "job_id", "visit_id", "kind", "detail", "who", "at")
select 'evt_note_visit_' || v."id", v."organization_id", 'visit', v."id", v."customer_id", v."job_id", v."id", 'note', jsonb_build_object('text', v."notes"), 'system', v."updated_at"
from "visit" v
where v."notes" is not null and trim(v."notes") <> ''
on conflict ("id") do nothing;--> statement-breakpoint
insert into "event" ("id", "organization_id", "about", "about_id", "customer_id", "job_id", "visit_id", "kind", "detail", "who", "at")
select 'evt_note_job_' || j."id", j."organization_id", 'job', j."id", j."customer_id", j."id", null, 'note', jsonb_build_object('text', j."notes"), 'system', j."updated_at"
from "job" j
where j."notes" is not null and trim(j."notes") <> ''
on conflict ("id") do nothing;--> statement-breakpoint
insert into "event" ("id", "organization_id", "about", "about_id", "customer_id", "job_id", "visit_id", "kind", "detail", "who", "at")
select 'evt_note_property_' || p."id", p."organization_id", 'property', p."id", p."customer_id", null, null, 'note', jsonb_build_object('text', p."notes"), 'system', p."updated_at"
from "property" p
where p."notes" is not null and trim(p."notes") <> ''
on conflict ("id") do nothing;
