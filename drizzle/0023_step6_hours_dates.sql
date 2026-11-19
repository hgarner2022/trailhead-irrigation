ALTER TABLE "person" ADD COLUMN "hours_start" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "hours_end" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "bookable_from" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "bookable_to" text;