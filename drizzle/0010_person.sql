CREATE TYPE "public"."person_role" AS ENUM('owner', 'admin', 'tech');--> statement-breakpoint
CREATE TABLE "person" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"email" text,
	"phone" text,
	"role" "person_role" DEFAULT 'tech' NOT NULL,
	"truck" text,
	"jobber_user_id" text,
	"calendar_feed_url" text,
	"working_days" jsonb DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb NOT NULL,
	"capacity_by_kind" jsonb DEFAULT '{"turn-on":8,"inspection":8,"blowout":10,"repair":4,"other":2}'::jsonb NOT NULL,
	"season_start" text,
	"season_end" text,
	"active" boolean DEFAULT true NOT NULL,
	"legacy_truck_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit" ADD COLUMN "person_id" text;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_org_idx" ON "person" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "person_org_email_unique" ON "person" USING btree ("organization_id",lower("email")) WHERE "person"."email" is not null;--> statement-breakpoint
ALTER TABLE "visit" ADD CONSTRAINT "visit_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_person_day_idx" ON "visit" USING btree ("person_id","scheduled_on");--> statement-breakpoint
-- Backfill: one person per admin_user (id person_<admin id>, keeping their sign-in) and one per truck (id person_<truck id>, keeping its scheduling fields with the truck name as the label; legacy_truck_id points back until step 6 drops it). Visits follow their truck to that person.
INSERT INTO "person" ("id", "organization_id", "name", "initials", "email", "role", "created_at", "updated_at")
SELECT 'person_' || "id", "organization_id", "name", "initials", "email", "role"::text::"person_role", "created_at", "updated_at" FROM "admin_user";--> statement-breakpoint
INSERT INTO "person" ("id", "organization_id", "name", "initials", "truck", "jobber_user_id", "calendar_feed_url", "working_days", "capacity_by_kind", "active", "legacy_truck_id", "created_at", "updated_at")
SELECT 'person_' || "id", "organization_id", "name", upper(left("name", 1)) || upper(right("name", 1)), "name", "jobber_user_id", "calendar_feed_url", "working_days", "capacity_by_kind", "active", "id", "created_at", "updated_at" FROM "truck";--> statement-breakpoint
UPDATE "person" SET "name" = 'Ryan Garner', "initials" = 'RG', "role" = 'owner' WHERE "legacy_truck_id" IS NOT NULL AND "truck" = 'Truck 1';--> statement-breakpoint
UPDATE "person" SET "name" = 'Second truck', "initials" = 'T2' WHERE "legacy_truck_id" IS NOT NULL AND "truck" = 'Truck 2';--> statement-breakpoint
UPDATE "visit" v SET "person_id" = p."id" FROM "person" p WHERE p."legacy_truck_id" = v."truck_id" AND v."person_id" IS NULL;--> statement-breakpoint
-- Merge: when Ryan is on the admin allow-list he must be one person, not an admin-derived row with his sign-in beside a Truck 1 row with his visits. Per organization, the admin-derived person named or emailed ryan% takes Truck 1's scheduling fields, Truck 1's visits move to him, and the Truck 1 person goes. Without a Ryan admin nothing changes.
UPDATE "person" a SET "name" = 'Ryan Garner', "initials" = 'RG', "role" = 'owner', "truck" = t."truck", "jobber_user_id" = t."jobber_user_id", "calendar_feed_url" = t."calendar_feed_url", "working_days" = t."working_days", "capacity_by_kind" = t."capacity_by_kind", "legacy_truck_id" = t."legacy_truck_id"
FROM "person" t
WHERE t."organization_id" = a."organization_id" AND t."legacy_truck_id" IS NOT NULL AND t."id" = 'person_' || t."legacy_truck_id" AND t."truck" = 'Truck 1'
  AND a."legacy_truck_id" IS NULL AND (a."name" ILIKE 'ryan%' OR a."email" ILIKE 'ryan%');--> statement-breakpoint
UPDATE "visit" v SET "person_id" = a."id"
FROM "person" t, "person" a
WHERE v."person_id" = t."id" AND t."legacy_truck_id" IS NOT NULL AND t."id" = 'person_' || t."legacy_truck_id"
  AND a."organization_id" = t."organization_id" AND a."legacy_truck_id" = t."legacy_truck_id" AND a."id" <> t."id";--> statement-breakpoint
DELETE FROM "person" t
WHERE t."legacy_truck_id" IS NOT NULL AND t."id" = 'person_' || t."legacy_truck_id"
  AND EXISTS (SELECT 1 FROM "person" a WHERE a."organization_id" = t."organization_id" AND a."legacy_truck_id" = t."legacy_truck_id" AND a."id" <> t."id");
