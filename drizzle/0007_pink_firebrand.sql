ALTER TYPE "public"."message_status" ADD VALUE 'skipped';--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "data" jsonb;