ALTER TABLE "message_log" ADD COLUMN "delivery_status" text;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "delivery_error" text;--> statement-breakpoint
CREATE INDEX "message_log_provider_id_idx" ON "message_log" USING btree ("provider_id");
