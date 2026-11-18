import "server-only"
import { and, eq, inArray, isNotNull, or } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

type JobRow = typeof s.job.$inferSelect

/**
 * The pass job an id names. A Season Pass is a job now, and its id is the job's; the ids the old `season_pass` table gave out
 * (in signed links, queued tasks, Stripe metadata, alert keys, browser storage) are kept on the job as `legacy_pass_id` and still
 * open it. Only a job with a season is a pass, so the id of any other job finds nothing. A job's own id wins over an old id that
 * happens to match another job's.
 */
export async function resolvePassJob(db: Database, organizationId: string, id: string): Promise<JobRow | null> {
  const rows = await db
    .select()
    .from(s.job)
    .where(and(eq(s.job.organizationId, organizationId), isNotNull(s.job.season), or(eq(s.job.id, id), eq(s.job.legacyPassId, id))))
  return rows.find((j) => j.id === id) ?? rows[0] ?? null
}

/** The same lookup for an entry point that does not know the organization yet (a signed link, a Stripe event); the job names it. */
export async function resolvePassJobAnywhere(db: Database, id: string): Promise<JobRow | null> {
  const rows = await db
    .select()
    .from(s.job)
    .where(and(isNotNull(s.job.season), or(eq(s.job.id, id), eq(s.job.legacyPassId, id))))
  return rows.find((j) => j.id === id) ?? rows[0] ?? null
}

/** The job id of each given pass id (new or old), for a list; an id that names no pass is left out of the map. */
export async function jobIdsOfPassIds(db: Database, organizationId: string, ids: readonly string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(ids)]
  const found = new Map<string, string>()
  if (wanted.length === 0) return found
  const rows = await db
    .select({ id: s.job.id, legacyPassId: s.job.legacyPassId })
    .from(s.job)
    .where(and(eq(s.job.organizationId, organizationId), isNotNull(s.job.season), or(inArray(s.job.id, wanted), inArray(s.job.legacyPassId, wanted))))
  for (const r of rows) if (r.legacyPassId && wanted.includes(r.legacyPassId)) found.set(r.legacyPassId, r.id)
  // A job's own id wins over an old id that matches the same text.
  for (const r of rows) if (wanted.includes(r.id)) found.set(r.id, r.id)
  return found
}
