-- 0010_person ran on the live database on Nov 16 2026 in its first form, before the case-insensitive email index and the Ryan merge were written into it. Those two were moved out of 0010 (which must stay what the database has seen) and into this migration, which also backfills visits the old code made between the two deploys. Every statement is a no-op where the work is already done.
DROP INDEX IF EXISTS "person_org_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "person_org_email_unique" ON "person" USING btree ("organization_id",lower("email")) WHERE "person"."email" is not null;--> statement-breakpoint
-- An admin added after 0010 ran has no person row yet.
INSERT INTO "person" ("id", "organization_id", "name", "initials", "email", "role", "created_at", "updated_at")
SELECT 'person_' || a."id", a."organization_id", a."name", a."initials", a."email", a."role"::text::"person_role", a."created_at", a."updated_at" FROM "admin_user" a
WHERE NOT EXISTS (SELECT 1 FROM "person" p WHERE p."id" = 'person_' || a."id");--> statement-breakpoint
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
  AND EXISTS (SELECT 1 FROM "person" a WHERE a."organization_id" = t."organization_id" AND a."legacy_truck_id" = t."legacy_truck_id" AND a."id" <> t."id");--> statement-breakpoint
-- Visits the pre-person code wrote after 0010 ran carry a truck and no person.
UPDATE "visit" v SET "person_id" = p."id" FROM "person" p WHERE p."legacy_truck_id" = v."truck_id" AND v."person_id" IS NULL;
