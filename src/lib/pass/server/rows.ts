import "server-only"
import { and, eq, isNotNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { mountainDay } from "@/api/v1/shared"
import { linesForPassVisits } from "@/lib/jobs/lines"
import { insertLines } from "@/lib/jobs/write-lines"
import { nextPassNumber } from "@/lib/pass/number"
import type { SeasonPassVisit } from "@/lib/season-pass"
import { createPassJob } from "./job"
import { passRecordOf, type PassRecord } from "./record"

export const WINDOW_LABEL = { "turn-on": "May", inspection: "July", blowout: "October" } as const

export interface PassRowsInput {
  organizationId: string
  customerId: string
  propertyId: string
  season: number
  /** the visits the pass sells today (`visitsOnSale`) */
  onSale: readonly SeasonPassVisit[]
  zones: number
  inspection: boolean
  turnOnPreference?: "earlier" | "recommended" | "later"
  blowoutPreference?: "earlier" | "recommended" | "later"
  /** pending for the checkout (the card step follows, so `sold_on` stays empty); active for a renewal on the card on file and for an office sale (sold today) */
  status: "pending" | "active"
  /** where the pass was sold: the website checkout or the office */
  source?: "checkout" | "office" | "renewal"
  /** the job this pass renews (a renewal only) */
  renewsJobId?: string
  now: Date
}

/** What `insertPassVisits` needs to know about the pass its visits belong to. */
export interface PassVisitsFor {
  organizationId: string
  jobId: string
  customerId: string
  propertyId: string
  zones: number
  turnOnPreference?: "earlier" | "recommended" | "later"
  blowoutPreference?: "earlier" | "recommended" | "later"
}

/**
 * The rows every pass is made of, whoever sells it: the job (with its season, the next pass number of that season and, for a
 * pass sold now, today's `sold_on`), one `unscheduled` visit per visit on sale at the per-zone price, and the job's line for each
 * visit. The pass number is retried twice when two sales race for the same one. The yard's zone count stays on the property,
 * which the caller has already written.
 */
export async function makePassRows(db: Database, input: PassRowsInput): Promise<PassRecord> {
  const { organizationId: org, now } = input
  let record: PassRecord | undefined
  for (let attempt = 0; attempt < 3 && !record; attempt++) {
    const numbers = await db.select({ n: s.job.passNumber }).from(s.job).where(and(eq(s.job.organizationId, org), eq(s.job.season, input.season), isNotNull(s.job.passNumber)))
    const number = nextPassNumber(input.season, numbers.map((r) => r.n!))
    try {
      const jobId = await createPassJob(db, { organizationId: org, customerId: input.customerId, propertyId: input.propertyId, source: input.source, season: input.season, passNumber: number, renewsJobId: input.renewsJobId, soldOn: input.status === "active" ? mountainDay(now) : null, createdAt: now })
      const [job] = await db.select().from(s.job).where(eq(s.job.id, jobId))
      record = passRecordOf(job!, input.zones)
    } catch (error) {
      if (attempt === 2) throw error
    }
  }
  await insertPassVisits(db, { ...record!, turnOnPreference: input.turnOnPreference, blowoutPreference: input.blowoutPreference }, input.onSale, now)
  return record!
}

/**
 * One unscheduled visit per visit on sale, priced by the pass's zones, and the job's line for each, named for the visit and
 * priced from the service of the pass's zone band; a visit's preference is the pass's for its kind.
 */
export async function insertPassVisits(db: Database, pass: PassVisitsFor, onSale: readonly SeasonPassVisit[], now?: Date): Promise<void> {
  if (onSale.length === 0) return
  const made = await db
    .insert(s.visit)
    .values(
      onSale.map((v) => ({
        organizationId: pass.organizationId,
        jobId: pass.jobId,
        customerId: pass.customerId,
        propertyId: pass.propertyId,
        kind: v.key,
        window: WINDOW_LABEL[v.key],
        status: "unscheduled" as const,
        preference: v.key === "turn-on" ? pass.turnOnPreference : v.key === "blowout" ? pass.blowoutPreference : undefined,
        // needsCustomerHome is a note for Ryan; no visit waits for the customer to pick.
        awaitingPick: false,
      })),
    )
    .returning({ id: s.visit.id, kind: s.visit.kind })
  // One visit per pass kind on a job (the visit_job_pass_kind_unique index enforces it), so the kind finds the visit.
  const lines = linesForPassVisits(onSale, pass.zones).map((line) => ({ ...line, visitId: made.find((v) => v.kind === line.visitKind)!.id }))
  await insertLines(db, { organizationId: pass.organizationId, jobId: pass.jobId, now }, lines)
}
