import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import { fileURLToPath } from "node:url"
import * as schema from "./schema"

/**
 * An empty in-memory Postgres (PGlite) with every migration applied. Database
 * tests use this and never reach Neon; `npm test` needs no network and no
 * DATABASE_URL. Each call is a fresh database.
 */
export async function testDb() {
  const client = new PGlite()
  const database = drizzle(client, { schema })
  await migrate(database, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  return Object.assign(database, { close: () => client.close() })
}

export type TestDb = Awaited<ReturnType<typeof testDb>>
