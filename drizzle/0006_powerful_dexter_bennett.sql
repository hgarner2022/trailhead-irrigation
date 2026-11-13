ALTER TABLE "schedule_run" ADD COLUMN "ran_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_run" ADD COLUMN "ran_by" text DEFAULT 'system' NOT NULL;