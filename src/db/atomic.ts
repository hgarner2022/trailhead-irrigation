import type { BatchItem } from "drizzle-orm/batch"
import type { Database } from "./types"

/**
 * Runs a list of writes as one unit: all of them or none. The Neon handle (HTTP) has no interactive transaction, only `batch`, which Neon runs as
 * one transaction; the PGlite handle in tests has `transaction` and no `batch`. `build` makes the queries (unawaited) from the handle it is given,
 * so each one runs on the batch or on the transaction.
 */
export async function atomically(db: Database, build: (d: Database) => PromiseLike<unknown>[]): Promise<void> {
  const batch = (db as unknown as { batch?: (queries: unknown[]) => Promise<unknown> }).batch
  if (typeof batch === "function") {
    await batch.call(db, build(db) as unknown as BatchItem<"pg">[])
    return
  }
  await db.transaction(async (tx) => {
    for (const query of build(tx as unknown as Database)) await query
  })
}
