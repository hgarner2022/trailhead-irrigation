# Database

Postgres on Neon, Drizzle ORM. The schema is `src/db/schema.ts`; migrations are SQL in `drizzle/` and are committed.

## Apply the migrations (Neon)

Nothing in the repo runs migrations by itself, and tests never touch Neon (they use an in-memory PGlite from `testDb()` in `src/db/test-db.ts`).

```bash
npx vercel env pull .env.local     # writes DATABASE_URL (git-ignored)
npm run db:migrate                 # applies drizzle/*.sql to that database
```

Run it against the development branch first. Seed a new database with `SEED_ADMINS=you@example.com npm run db:seed` (add `SEED_FIXTURE_PASSES=yes` on the development branch only).

## Changing the schema

Edit `src/db/schema.ts`, run `npm run db:generate`, review and commit the new SQL. Triggers and other SQL Drizzle cannot express go in a `npm run db:generate -- --custom --name=<what>` migration (see `0001_consent_append_only.sql`, which makes `consent` append-only).

## Rules

- `import "server-only"` at the top of every file that touches the database; the seed and `scripts/db-seed.ts` are the exceptions (tsx cannot load it) and take their handle as an argument.
- Every table has `organization_id`; money is whole dollars; timestamps are `timestamptz`; `date` columns are Mountain-time calendar days (YYYY-MM-DD strings).
- Jobber is read-only for the app: the `jobber_*` id columns on `customer`, `property`, `visit` and `service` are nullable and are filled by the read-only mirror or never. The `jobber_*` mirror tables are only ever written by the sync.
- Services and prices come from `src/lib/services.ts`, which reads the site's own price modules. Aligning the Jobber catalogue to them is a write to Jobber and is left undone (no Jobber writes); Hannah or Ryan edits the catalogue by hand if wanted.
