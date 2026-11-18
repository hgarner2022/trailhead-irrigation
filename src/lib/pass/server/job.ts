import "server-only"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/**
 * The job a Season Pass is: the season, the pass number and the job it renews are the job's own columns, and `sold_on` is the
 * day it was sold (empty while the website checkout's card step is not finished, which is what "pending" means). The job has no
 * kind, status or price of its own: a pass is the job with a season, and its price is its lines'.
 */
export async function createPassJob(db: Database, job: { organizationId: string; customerId: string; propertyId: string; source?: "checkout" | "office" | "renewal"; season: number; passNumber: string; renewsJobId?: string | null; soldOn?: string | null; createdAt?: Date }): Promise<string> {
  const [row] = await db.insert(s.job).values({ ...job, source: job.source ?? "checkout" }).returning({ id: s.job.id })
  return row!.id
}
