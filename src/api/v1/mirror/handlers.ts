import "server-only"
import { eq, getTableColumns, sql } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import { z } from "zod"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Iso, Town } from "../shared"

const JobberId = z.string().min(1).max(200).describe("Jobber's own id (its GraphQL id, as text).")
const url = z.string().url().max(500).optional()
const date = Iso.pipe(z.coerce.date()).optional()
const money = z.number().int().min(0).optional().describe("Whole dollars.")
const text = (n = 200) => z.string().max(n).optional()
const rows = <T extends z.ZodType>(item: T) => z.array(item).max(200).default([])

const Client = z.object({ id: JobberId, firstName: text(), lastName: text(), email: text(), phone: text(), town: Town.optional(), jobberUrl: url })
const Job = z.object({ id: JobberId, clientId: text(), title: text(), status: text(40), hasVisit: z.boolean().default(false), total: money, jobberUrl: url })
const VisitRow = z.object({ id: JobberId, jobId: text(), clientId: text(), title: text(), kind: z.enum(s.visitKindEnum.enumValues).optional(), town: Town.optional(), startAt: date, endAt: date, assignedUserId: text(), completedAt: date, jobberUrl: url })
const Quote = z.object({ id: JobberId, clientId: text(), clientName: text(), town: Town.optional(), total: money, sentAt: date, status: z.enum(s.quoteStatusEnum.enumValues).optional(), jobberUrl: url })
const Invoice = z.object({ id: JobberId, clientId: text(), clientName: text(), total: money, issuedAt: date, dueAt: date, status: z.enum(s.invoiceStatusEnum.enumValues).optional(), jobberUrl: url })

const COUNTS = z.object({ clients: z.number().int(), jobs: z.number().int(), visits: z.number().int(), quotes: z.number().int(), invoices: z.number().int() })

/** Upsert by Jobber id, scoped to the organization: a row another organization owns is never overwritten. */
async function upsert(db: Database, organizationId: string, table: PgTable & { id: never; organizationId: never }, data: Record<string, unknown>[]) {
  if (!data.length) return
  const columns = getTableColumns(table as unknown as PgTable) as Record<string, { name: string }>
  // Rows of one call share the union of their fields (a missing one inserts as null); on update only the fields the call names change.
  const all = new Set(data.flatMap((r) => Object.keys(r)))
  const values = data.map((r) => ({ ...Object.fromEntries([...all].map((k) => [k, null])), ...r, organizationId, syncedAt: new Date() }))
  const set = Object.fromEntries([...all].filter((k) => k !== "id").map((k) => [k, sql.raw(`excluded."${columns[k]!.name}"`)]))
  set.syncedAt = sql.raw('excluded."synced_at"')
  await db.insert(table as never).values(values as never).onConflictDoUpdate({ target: (table as unknown as { id: never }).id, set: set as never, setWhere: eq((table as unknown as { organizationId: never }).organizationId, organizationId) as never })
}

export const mirrorUpsert = defineHandler({
  name: "mirror.upsert",
  method: "POST",
  path: "/mirror",
  scope: "write",
  summary: "Mirror Jobber's clients, jobs, visits, quotes and invoices into the app, read-only copies for the dashboard's totals and for capacity. Idempotent on Jobber's id: send the same record again and it updates in place. Up to 200 of each kind per call. Calendar-feed blocks (ids starting `feed:`) are the feed's and are refused.",
  input: z.object({ clients: rows(Client), jobs: rows(Job), visits: rows(VisitRow), quotes: rows(Quote), invoices: rows(Invoice) }),
  output: COUNTS,
  async run(ctx, input) {
    if (input.visits.some((v) => v.id.startsWith("feed:"))) throw new ApiError("invalid", "Visit ids starting `feed:` belong to the calendar feed")
    const org = ctx.organizationId
    await upsert(ctx.db, org, s.jobberClient as never, input.clients)
    await upsert(ctx.db, org, s.jobberJob as never, input.jobs)
    await upsert(ctx.db, org, s.jobberVisit as never, input.visits)
    await upsert(ctx.db, org, s.jobberQuote as never, input.quotes)
    await upsert(ctx.db, org, s.jobberInvoice as never, input.invoices)
    const counts = { clients: input.clients.length, jobs: input.jobs.length, visits: input.visits.length, quotes: input.quotes.length, invoices: input.invoices.length }
    await ctx.db.insert(s.syncRun).values({ organizationId: org, kind: "mirror", finishedAt: ctx.now, status: "ok", counts })
    return counts
  },
})
