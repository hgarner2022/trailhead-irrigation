ALTER TABLE "property" ADD COLUMN "zones" integer;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "controller" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "backflow_location" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "gate_code" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "must_be_home" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "access_note" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "notes" text;--> statement-breakpoint
update "property" p
set "zones" = sp."zones", "must_be_home" = sp."needs_customer_home", "access_note" = sp."access_note"
from (
  select distinct on ("property_id") "property_id", "zones", "needs_customer_home", "access_note"
  from "season_pass"
  order by "property_id", ("status" = 'active') desc, "created_at" desc
) sp
where sp."property_id" = p."id" and p."zones" is null;
