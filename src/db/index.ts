import "server-only"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { readEnv } from "@/lib/env"
import * as schema from "./schema"

let handle: ReturnType<typeof create> | undefined

function create() {
  const { DATABASE_URL } = readEnv(["DATABASE_URL"])
  return drizzle(neon(DATABASE_URL), { schema })
}

/** The Neon handle, created on first use so importing this module never needs DATABASE_URL. */
export function db() {
  handle ??= create()
  return handle
}

export { schema }
