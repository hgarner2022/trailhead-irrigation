ALTER TABLE "job" ADD COLUMN "season" integer;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "pass_number" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "renews_job_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "job_org_pass_number_unique" ON "job" USING btree ("organization_id","pass_number") WHERE pass_number is not null;--> statement-breakpoint
CREATE INDEX "job_org_season_idx" ON "job" USING btree ("organization_id","season");--> statement-breakpoint
update "job" j
set "season" = sp."season", "pass_number" = sp."number"
from "season_pass" sp
where sp."job_id" = j."id" and j."pass_number" is null;--> statement-breakpoint
update "job" j
set "renews_job_id" = oldp."job_id"
from "pass_change" pc
join "season_pass" newp on newp."id" = pc."pass_id"
join "season_pass" oldp on oldp."id" = (pc."detail"->>'from')
where pc."kind" = 'renewed' and newp."job_id" = j."id" and j."renews_job_id" is null;--> statement-breakpoint
update "job" set "source" = 'renewal' where "renews_job_id" is not null and "source" = 'checkout';
