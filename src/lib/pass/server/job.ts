import "server-only"
import { and, eq, notInArray, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/** The job a Season Pass is: made with the pass, kept in step with it (`syncPassJob`). A job is the sold work; the pass row holds only what is pass-specific. */
export async function createPassJob(db: Database, job: { organizationId: string; customerId: string; propertyId: string; status?: "pending" | "active"; createdAt?: Date }): Promise<string> {
  const [row] = await db.insert(s.job).values({ ...job, kind: "pass", source: "checkout", status: job.status ?? "pending" }).returning({ id: s.job.id })
  return row!.id
}

/** Copies the pass's status and the total of its visits onto its job: pending, active, cancelled (lapsed reads as done). */
export async function syncPassJob(db: Database, passId: string): Promise<void> {
  const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, passId))
  if (!pass) return
  const [sum] = await db
    .select({ total: sql<number>`coalesce(sum(${s.visit.amount}), 0)::int` })
    .from(s.visit)
    .where(and(eq(s.visit.passId, passId), notInArray(s.visit.status, ["cancelled"])))
  const status = pass.status === "lapsed" ? "done" : pass.status
  await db
    .update(s.job)
    .set({ status, price: sum?.total ?? 0, propertyId: pass.propertyId, cancelledAt: pass.cancelledAt ?? null, updatedAt: new Date() })
    .where(eq(s.job.id, pass.jobId))
}
