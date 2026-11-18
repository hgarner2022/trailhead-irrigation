import "server-only"
import { and, eq, isNotNull, or } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/**
 * A Season Pass as the server modules use it: the pass job's own columns under the names they always had. `id` is the job's id
 * (the pass id of every new link and message), `zones` is the yard's on the property. Read from the job, never from a pass table.
 */
export interface PassRecord {
  id: string
  jobId: string
  organizationId: string
  customerId: string
  propertyId: string
  number: string
  season: number
  zones: number
  soldOn: string | null
  cancelledAt: Date | null
  createdAt: Date
  renewsJobId: string | null
}

type JobRow = typeof s.job.$inferSelect

export function passRecordOf(job: JobRow, zones: number | null): PassRecord {
  return {
    id: job.id,
    jobId: job.id,
    organizationId: job.organizationId,
    customerId: job.customerId,
    propertyId: job.propertyId,
    number: job.passNumber ?? "",
    season: job.season ?? 0,
    zones: zones ?? 0,
    soldOn: job.soldOn,
    cancelledAt: job.cancelledAt,
    createdAt: job.createdAt,
    renewsJobId: job.renewsJobId,
  }
}

/** The pass whose job has this id, or whose old pass id it is; null when there is none. `organizationId` limits the lookup when the caller knows it. */
export async function loadPassRecord(db: Database, id: string, organizationId?: string): Promise<PassRecord | null> {
  const rows = await db
    .select({ job: s.job, zones: s.property.zones })
    .from(s.job)
    .innerJoin(s.property, eq(s.property.id, s.job.propertyId))
    .where(and(isNotNull(s.job.season), or(eq(s.job.id, id), eq(s.job.legacyPassId, id)), organizationId ? eq(s.job.organizationId, organizationId) : undefined))
  const row = rows.find((r) => r.job.id === id) ?? rows[0]
  return row ? passRecordOf(row.job, row.zones) : null
}
