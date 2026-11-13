// Applies the committed migrations before `next build` when a database is
// configured, so a deploy to Vercel migrates the Neon database it was given
// (DATABASE_URL is a sensitive variable there, so it cannot be pulled to a
// laptop; the build is where it is readable). With no DATABASE_URL, as on a
// fresh clone, a preview deploy without a database, or Storybook, it does
// nothing. Migrations are idempotent, so running on every deploy is safe.
//
// When SEED_ADMINS is set as well, the seed runs after the migrations; the
// seed itself is idempotent (it inserts only what is missing).

import { spawnSync } from "node:child_process"

const url = process.env.DATABASE_URL
if (!url) {
  console.log("db-migrate-on-build: no DATABASE_URL, skipping migrations")
  process.exit(0)
}

const run = (args) => {
  const result = spawnSync("npx", args, { stdio: "inherit", env: process.env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log("db-migrate-on-build: applying migrations")
run(["drizzle-kit", "migrate"])

if (process.env.SEED_ADMINS) {
  console.log("db-migrate-on-build: seeding (SEED_ADMINS is set)")
  run(["tsx", "scripts/db-seed.ts"])
}
