-- Data only: Hannah has two person rows, "Hannah Garner" (on the Schedule, takes visits) and "Hannahn.garner" (her login row, takes none). Per organization, when both exist, the login row's email and role move onto the Schedule row and the login row goes inactive with no email. The Schedule row keeps its truck label, days, hours, capacity and visits (visits point at it already; events carry an email string, not a person id).
-- Guarded: nothing happens unless an active "Hannah Garner" and a different active person holding hannahn.garner@gmail.com both exist in the same organization. After one run the login row has no email and is inactive, so a second run finds nothing. The whole block is one statement, so it is atomic.
DO $$
DECLARE
  o record;
  keep_id text;
  drop_id text;
  drop_name text;
  drop_role text;
  keep_email text;
  keep_role text;
  new_role text;
  rank_of constant jsonb := '{"owner": 3, "admin": 2, "tech": 1}';
BEGIN
  FOR o IN SELECT DISTINCT "organization_id" FROM "person" LOOP
    keep_id := NULL;
    drop_id := NULL;
    SELECT p."id" INTO keep_id FROM "person" p
      WHERE p."organization_id" = o."organization_id" AND p."active" AND p."name" = 'Hannah Garner'
      ORDER BY p."created_at", p."id" LIMIT 1;
    CONTINUE WHEN keep_id IS NULL;
    SELECT p."id", p."name", p."role"::text INTO drop_id, drop_name, drop_role FROM "person" p
      WHERE p."organization_id" = o."organization_id" AND p."active" AND lower(p."email") = 'hannahn.garner@gmail.com' AND p."id" <> keep_id
      ORDER BY p."created_at", p."id" LIMIT 1;
    CONTINUE WHEN drop_id IS NULL;
    SELECT p."email", p."role"::text INTO keep_email, keep_role FROM "person" p WHERE p."id" = keep_id;
    new_role := CASE WHEN (rank_of->>drop_role)::int > (rank_of->>keep_role)::int THEN drop_role ELSE keep_role END;
    -- free the email for the unique index first
    UPDATE "person" SET "email" = NULL, "active" = false, "updated_at" = now() WHERE "id" = drop_id;
    UPDATE "person" SET "email" = 'hannahn.garner@gmail.com', "role" = new_role::"person_role", "updated_at" = now() WHERE "id" = keep_id;
    INSERT INTO "settings_change" ("id", "organization_id", "by_email", "field", "from_value", "to_value")
      VALUES (gen_random_uuid()::text, o."organization_id", 'migration', 'Hannah Garner email', coalesce(keep_email, '(none)'), 'hannahn.garner@gmail.com');
    IF new_role <> keep_role THEN
      INSERT INTO "settings_change" ("id", "organization_id", "by_email", "field", "from_value", "to_value")
        VALUES (gen_random_uuid()::text, o."organization_id", 'migration', 'Hannah Garner role', keep_role, new_role);
    END IF;
    INSERT INTO "settings_change" ("id", "organization_id", "by_email", "field", "from_value", "to_value")
      VALUES (gen_random_uuid()::text, o."organization_id", 'migration', drop_name || ' deactivated', 'active', 'merged into Hannah Garner');
  END LOOP;
END $$;
