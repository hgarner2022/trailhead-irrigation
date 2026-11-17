-- The Nov 16 2026 deploy seed put the snapshot's person_truck-1 back after 0011 had merged Truck 1 into Ryan's admin row, so Truck 1 was held by two people. The merge's own two statements fold any such duplicate into the person who keeps the sign-in; a database with one person per truck is untouched.
UPDATE "visit" v SET "person_id" = a."id"
FROM "person" t, "person" a
WHERE v."person_id" = t."id" AND t."legacy_truck_id" IS NOT NULL AND t."id" = 'person_' || t."legacy_truck_id"
  AND a."organization_id" = t."organization_id" AND a."legacy_truck_id" = t."legacy_truck_id" AND a."id" <> t."id";--> statement-breakpoint
DELETE FROM "person" t
WHERE t."legacy_truck_id" IS NOT NULL AND t."id" = 'person_' || t."legacy_truck_id"
  AND EXISTS (SELECT 1 FROM "person" a WHERE a."organization_id" = t."organization_id" AND a."legacy_truck_id" = t."legacy_truck_id" AND a."id" <> t."id");
