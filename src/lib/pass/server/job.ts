import "server-only"
import { and, eq, notInArray, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/**
 * The job a Season Pass is: the season, the pass number and the job it renews are the job's own columns, and `sold_on` is the
 * day it was sold (empty while the website checkout's card step is not finished, which is what "pending" means).
 */
export async function createPassJob(db: Database, job: { organizationId: string; customerId: string; propertyId: string; source?: "checkout" | "office" | "renewal"; season: number; passNumber: string; renewsJobId?: string | null; soldOn?: string | null; createdAt?: Date }): Promise<string> {
  const [row] = await db.insert(s.job).values({ ...job, kind: "pass", source: job.source ?? "checkout" }).returning({ id: s.job.id })
  return row!.id
}

/** Keeps the job's price column at the total of its visits that are not cancelled (the column goes with step 6.2b, when the price is only the lines'). */
export async function refreshPassJobPrice(db: Database, jobId: string): Promise<void> {
  const [sum] = await db
    .select({ total: sql<number>`coalesce(sum(${s.visit.amount}), 0)::int` })
    .from(s.visit)
    .where(and(eq(s.visit.jobId, jobId), notInArray(s.visit.status, ["cancelled"])))
  await db.update(s.job).set({ price: sum?.total ?? 0, updatedAt: new Date() }).where(eq(s.job.id, jobId))
}
