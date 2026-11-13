CREATE TABLE "pass_change" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"pass_id" text,
	"visit_id" text,
	"kind" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"by_principal" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pass_change" ADD CONSTRAINT "pass_change_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pass_change" ADD CONSTRAINT "pass_change_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pass_change" ADD CONSTRAINT "pass_change_pass_id_season_pass_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."season_pass"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pass_change" ADD CONSTRAINT "pass_change_visit_id_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pass_change_pass_idx" ON "pass_change" USING btree ("pass_id","at");