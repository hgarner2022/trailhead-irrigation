ALTER TABLE "charge" ALTER COLUMN "visit_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "charge" ADD COLUMN "job_id" text;--> statement-breakpoint
ALTER TABLE "charge" ADD COLUMN "customer_id" text;--> statement-breakpoint
ALTER TABLE "charge" ADD COLUMN "paid_on" date;--> statement-breakpoint
ALTER TABLE "charge" ADD COLUMN "refunds_payment_id" text;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charge_job_idx" ON "charge" USING btree ("job_id");--> statement-breakpoint
update "charge" c
set "job_id" = v."job_id", "customer_id" = v."customer_id", "paid_on" = coalesce(v."completed_on", (c."created_at" at time zone 'America/Denver')::date)
from "visit" v
where v."id" = c."visit_id" and c."job_id" is null;
