ALTER TABLE "charge" ADD COLUMN "method" text DEFAULT 'card_on_file' NOT NULL;--> statement-breakpoint
ALTER TABLE "charge" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "visit" ADD COLUMN "not_done_reason" text;