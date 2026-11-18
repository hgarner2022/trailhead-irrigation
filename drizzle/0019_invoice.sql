CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"number" text NOT NULL,
	"lines" jsonb NOT NULL,
	"amount" integer NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"sent_on" date NOT NULL,
	"due_on" date NOT NULL,
	"paid_on" date,
	"payment_id" text,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_org_number_unique" ON "invoice" USING btree ("organization_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_job_open_unique" ON "invoice" USING btree ("job_id") WHERE paid_on is null and cancelled_at is null;--> statement-breakpoint
CREATE INDEX "invoice_org_due_idx" ON "invoice" USING btree ("organization_id","due_on");--> statement-breakpoint
CREATE INDEX "invoice_job_idx" ON "invoice" USING btree ("job_id");