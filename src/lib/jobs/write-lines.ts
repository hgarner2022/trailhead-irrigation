// What every writer does with a job's lines: insert them beside the visits with
// the organization's service row attached, cancel a visit's line, reprice it, or
// take it away with its visit. No `server-only` here on purpose: the seed runs
// this under tsx with its own database handle (see `src/db/seed.ts`). It touches
// only the handle it is given. The words and prices come from `lines.ts`.
// neon-http has no interactive transactions, so a visit can exist briefly without its line if the second
// statement fails. Recovery is a retry of the creating call; the reconciliation query is "visits not
// cancelled with no line_item row naming them".
import { and, eq, inArray, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { ServiceKind } from "@/lib/services"
import { lineForVisitKind, type Line } from "./lines"

/** A line the writer has attached to its visit. The id is the row's default unless the writer fixes one (the seed uses the backfill's `line_<visit id>`). */
export type VisitLine = Line & { id?: string; visitId?: string | null }

export interface InsertLinesOptions {
  organizationId: string
  jobId: string
  /** the sale's own time; the row's default otherwise */
  now?: Date
  /** keep a row that already holds the id (the seed, run again) */
  keepExisting?: boolean
}

/** The organization's service rows the lines name, by key: the id, and the description and taxable flag the row holds at the sale. */
async function servicesByKey(db: Database, organizationId: string, keys: readonly string[]) {
  const unique = [...new Set(keys)]
  const rows = unique.length
    ? await db
        .select({ id: s.service.id, key: s.service.key, description: s.service.description, taxable: s.service.taxable })
        .from(s.service)
        .where(and(eq(s.service.organizationId, organizationId), inArray(s.service.key, unique)))
    : []
  return new Map(rows.map((r) => [r.key, r]))
}

/**
 * Inserts a job's lines. Each takes the organization's service row for its key (none when no service fits), that row's
 * description and taxable flag as they are at the sale (the catalogue's words when the row has none), and the visit it is
 * billed after.
 */
export async function insertLines(db: Database, { organizationId, jobId, now, keepExisting }: InsertLinesOptions, lines: readonly VisitLine[]): Promise<void> {
  if (lines.length === 0) return
  const services = await servicesByKey(db, organizationId, lines.flatMap((l) => (l.serviceKey ? [l.serviceKey] : [])))
  const rows = lines.map((line) => {
    const service = line.serviceKey ? services.get(line.serviceKey) : undefined
    return {
      ...(line.id ? { id: line.id } : {}),
      organizationId,
      jobId,
      serviceId: service?.id ?? null,
      visitId: line.visitId ?? null,
      name: line.name,
      description: service?.description ?? line.description ?? null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxable: service?.taxable ?? line.taxable,
      cancelledAt: line.cancelledAt ?? null,
      ...(now ? { createdAt: now, updatedAt: now } : {}),
    }
  })
  const insert = db.insert(s.lineItem).values(rows)
  if (keepExisting) await insert.onConflictDoNothing()
  else await insert
}

/** A skipped or cancelled visit's line counts for nothing from now on; a line already cancelled keeps its time. */
export async function cancelVisitLines(db: Database, visitIds: readonly string[], now: Date): Promise<void> {
  if (visitIds.length === 0) return
  await db
    .update(s.lineItem)
    .set({ cancelledAt: now, updatedAt: now })
    .where(and(inArray(s.lineItem.visitId, [...visitIds]), isNull(s.lineItem.cancelledAt)))
}

/** Reprices the visit's line. A visit that has no line yet (a later visit of a one-off job from before the lines) gets one of its kind. */
export async function setVisitLinePrice(db: Database, visit: { id: string; organizationId: string; jobId: string; kind: ServiceKind }, price: number, now: Date): Promise<void> {
  const changed = await db.update(s.lineItem).set({ unitPrice: price, updatedAt: now }).where(eq(s.lineItem.visitId, visit.id)).returning({ id: s.lineItem.id })
  if (changed.length === 0) await insertLines(db, { organizationId: visit.organizationId, jobId: visit.jobId, now }, [{ ...lineForVisitKind(visit.kind, price), visitId: visit.id }])
}

/** The lines of visits being taken away (a refused day takes a New visit back): gone before the visits they point at. */
export async function deleteVisitLines(db: Database, visitIds: readonly string[]): Promise<void> {
  if (visitIds.length === 0) return
  await db.delete(s.lineItem).where(inArray(s.lineItem.visitId, [...visitIds]))
}

/** The lines of every visit of the passes given (a held pending pass rebuilt, an unpaid pass removed): gone before the visits. */
export async function deletePassVisitLines(db: Database, passIds: readonly string[]): Promise<void> {
  if (passIds.length === 0) return
  const visits = db.select({ id: s.visit.id }).from(s.visit).where(inArray(s.visit.passId, [...passIds]))
  await db.delete(s.lineItem).where(inArray(s.lineItem.visitId, visits))
}

/** What `addJobLine` takes: a line the office types or picks from the catalogue, for a job that is already sold. */
export interface NewJobLine {
  organizationId: string
  jobId: string
  name: string
  description?: string | null
  quantity: number
  unitPrice: number
  taxable: boolean
  /** the catalogue service the line was picked from */
  serviceId?: string | null
  now: Date
}

/** Adds one line to a sold job (no visit: it is on the job as a whole) and answers the row. */
export async function addJobLine(db: Database, line: NewJobLine): Promise<typeof s.lineItem.$inferSelect> {
  const { now, ...rest } = line
  const [row] = await db
    .insert(s.lineItem)
    .values({ ...rest, description: rest.description ?? null, serviceId: rest.serviceId ?? null, visitId: null, createdAt: now, updatedAt: now })
    .returning()
  return row!
}

/** Changes a line's name, quantity or unit price; a field left out stays. A visit's own line keeps the visit's amount alias in step. */
export async function updateLineRow(db: Database, line: { id: string; visitId: string | null }, changes: { name?: string; quantity?: number; unitPrice?: number }, now: Date): Promise<typeof s.lineItem.$inferSelect> {
  const set = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
  const [row] = await db.update(s.lineItem).set({ ...set, updatedAt: now }).where(eq(s.lineItem.id, line.id)).returning()
  if (line.visitId) await syncVisitAmount(db, line.visitId)
  return row!
}

/** Cancels one line: it counts for nothing from now on, and a visit's amount alias follows. */
export async function cancelLineRow(db: Database, line: { id: string; visitId: string | null }, now: Date): Promise<typeof s.lineItem.$inferSelect> {
  const [row] = await db.update(s.lineItem).set({ cancelledAt: now, updatedAt: now }).where(eq(s.lineItem.id, line.id)).returning()
  if (line.visitId) await syncVisitAmount(db, line.visitId)
  return row!
}

/** `visit.amount` is an alias of the visit's own live lines until step 6. */
async function syncVisitAmount(db: Database, visitId: string): Promise<void> {
  const lines = await db.select().from(s.lineItem).where(and(eq(s.lineItem.visitId, visitId), isNull(s.lineItem.cancelledAt)))
  await db.update(s.visit).set({ amount: lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) }).where(eq(s.visit.id, visitId))
}
