// Seeds the database named by DATABASE_URL (from .env.local or the shell).
// Builds its own handle: no `server-only`, so tsx can run it. Run it only
// against the Neon development branch unless you mean to seed production:
//   SEED_ADMINS=you@example.com npm run db:seed
//   SEED_FIXTURE_PASSES=yes SEED_ADMINS=you@example.com npm run db:seed
import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "../src/db/schema"
import { seed } from "../src/db/seed"
import snapshot from "../src/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "../src/lib/admin/types"

config({ path: ".env.local", quiet: true })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  const data = snapshot as AdminData
  const admins = (process.env.SEED_ADMINS ?? "").split(",").map((e) => e.trim()).filter(Boolean)
  const passes = process.env.SEED_FIXTURE_PASSES === "yes"
  const db = drizzle(neon(url), { schema })
  await seed(db, data, { organizationId: data.organizationId, admins, passes })
  console.log(`Seeded ${data.organizationId}: ${admins.length} admin(s)${passes ? ", fixture passes" : ""}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
