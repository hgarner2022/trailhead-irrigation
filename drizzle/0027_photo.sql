CREATE TABLE IF NOT EXISTS "photo" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"job_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"blob_key" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"added_by" text NOT NULL,
	"shown_to_customer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "photo_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "photo_visit_id_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visit"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "photo_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "photo_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_visit_idx" ON "photo" USING btree ("organization_id","visit_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_job_idx" ON "photo" USING btree ("organization_id","job_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "photo_blob_key_unique" ON "photo" USING btree ("blob_key");
