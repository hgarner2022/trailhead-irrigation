ALTER TYPE "public"."principal_kind" ADD VALUE 'public';--> statement-breakpoint
CREATE TABLE "admin_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"pass_id" text,
	"message" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_alert_kind_key_unique" UNIQUE("organization_id","kind","key")
);
--> statement-breakpoint
ALTER TABLE "admin_alert" ADD CONSTRAINT "admin_alert_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_alert" ADD CONSTRAINT "admin_alert_pass_id_season_pass_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."season_pass"("id") ON DELETE no action ON UPDATE no action;