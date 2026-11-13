# Database

Postgres on Neon, Drizzle ORM. The schema is `src/db/schema.ts`; migrations are SQL in `drizzle/` and are committed.

## Apply the migrations (Neon)

The deploy does it. `npm run build` runs `scripts/db-migrate-on-build.mjs` first, which applies `drizzle/*.sql` when `DATABASE_URL` is set (it is, on Vercel's production builds; it is empty on a laptop and on previews without a database, where the step skips). When `SEED_ADMINS` is also set in the project's production environment, the seed runs after the migrations; both are idempotent, so every deploy may run them. Neon's variables are marked Sensitive in Vercel, so `npx vercel env pull` writes them empty: that is why the build, not a laptop, applies migrations.

### By hand, if ever needed

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

## Jobber read-only (Phase 6)

Two ways in, neither writes to Jobber. Each truck's `calendar_feed_url` (its Jobber calendar subscription) is read every five minutes by `/api/cron/feed` (guarded by `CRON_SECRET`, scheduled in `vercel.json`) into busy blocks in `jobber_visit` (`is_block`, `truck_id`, id `feed:<truckId>:<uid>`), which `schedule.slots` subtracts from capacity. The rest of the mirror is filled by the scheduled Claude routine through `mirror.upsert`; see `docs/jobber-routine.md`. Geocoding is one Nominatim lookup per property, cached on the row (`GEOCODE_CONTACT`).
