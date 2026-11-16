import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { nextPassNumber } from "@/lib/pass/number"
import { visitPrice, type SeasonPassVisit } from "@/lib/season-pass"
import { createPassJob, syncPassJob } from "./job"

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
  needsCustomerHome?: boolean
  accessNote?: string | null
  /** pending for the checkout (the card step follows); active for a renewal on the card on file and for an office sale */
  status: "pending" | "active"
  /** where the pass was sold: the website checkout or the office */
  source?: "checkout" | "office"
  /** the card a renewal carries over; an office sale and the checkout's pending pass have none yet */
  card?: { stripePaymentMethodId: string | null; cardBrand: string | null; cardLast4: string | null; cardExpires: string | null }
  now: Date
}

/**
 * The rows every pass is made of, whoever sells it: the job (kind pass), the `season_pass` with the next number of its season,
 * and one `unscheduled` visit per visit on sale at the per-zone price. The pass number is retried twice when two sales race
 * for the same one. The job's status and price are synced from the pass and its visits.
 */
export async function makePassRows(db: Database, input: PassRowsInput): Promise<typeof s.seasonPass.$inferSelect> {
  const { organizationId: org, now } = input
  let pass: typeof s.seasonPass.$inferSelect | undefined
  for (let attempt = 0; attempt < 3 && !pass; attempt++) {
    const numbers = await db.select({ n: s.seasonPass.number }).from(s.seasonPass).where(and(eq(s.seasonPass.organizationId, org), eq(s.seasonPass.season, input.season)))
    try {
      const jobId = await createPassJob(db, { organizationId: org, customerId: input.customerId, propertyId: input.propertyId, status: input.status, source: input.source, createdAt: now })
      ;[pass] = await db
        .insert(s.seasonPass)
        .values({
          jobId,
          organizationId: org,
          number: nextPassNumber(input.season, numbers.map((r) => r.n)),
          season: input.season,
          customerId: input.customerId,
          propertyId: input.propertyId,
          zones: input.zones,
          inspection: input.inspection,
          turnOnPreference: input.turnOnPreference ?? "recommended",
          blowoutPreference: input.blowoutPreference ?? "recommended",
          needsCustomerHome: input.needsCustomerHome ?? false,
          accessNote: input.accessNote ?? null,
          status: input.status,
          ...(input.card ?? {}),
          createdAt: now,
        })
        .returning()
    } catch (error) {
      if (attempt === 2) throw error
    }
  }
  await insertPassVisits(db, pass!, input.onSale)
  await syncPassJob(db, pass!.id)
  return pass!
}

/** One unscheduled visit per visit on sale, priced by the pass's zones; a visit's preference is the pass's for its kind. */
export async function insertPassVisits(db: Database, pass: typeof s.seasonPass.$inferSelect, onSale: readonly SeasonPassVisit[]): Promise<void> {
  if (onSale.length === 0) return
  await db.insert(s.visit).values(
    onSale.map((v) => ({
      organizationId: pass.organizationId,
      jobId: pass.jobId,
      passId: pass.id,
      customerId: pass.customerId,
      propertyId: pass.propertyId,
      kind: v.key,
      window: WINDOW_LABEL[v.key],
      amount: visitPrice(v, pass.zones),
      status: "unscheduled" as const,
      preference: v.key === "turn-on" ? pass.turnOnPreference : v.key === "blowout" ? pass.blowoutPreference : undefined,
      // needsCustomerHome is a note for Ryan; no visit waits for the customer to pick.
      awaitingPick: false,
    })),
  )
}
