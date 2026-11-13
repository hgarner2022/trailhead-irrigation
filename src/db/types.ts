import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"
import type * as schema from "./schema"

/**
 * What every library function takes first: the Neon handle in production, the
 * in-memory PGlite handle in tests. Both are Drizzle Postgres databases over
 * the same schema, so the functions never know which they have.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>
