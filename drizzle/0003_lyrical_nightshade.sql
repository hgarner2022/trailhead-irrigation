ALTER TYPE "public"."queue_kind" ADD VALUE 'jobber-feed-sync';--> statement-breakpoint
ALTER TABLE "jobber_visit" ADD COLUMN "truck_id" text;--> statement-breakpoint
ALTER TABLE "truck" ADD COLUMN "calendar_feed_url" text;--> statement-breakpoint
ALTER TABLE "jobber_visit" ADD CONSTRAINT "jobber_visit_truck_id_truck_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."truck"("id") ON DELETE cascade ON UPDATE no action;