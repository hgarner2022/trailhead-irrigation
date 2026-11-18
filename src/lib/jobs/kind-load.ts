import "server-only"
import { and, asc, eq, inArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { jobKindOf, type JobKind } from "./kind"

/** Past this many jobs the loader reads the whole organization instead of listing ids. */
const ID_LIST_LIMIT = 500

/**
 * The derived kind of each job given (`jobKindOf`): a Season Pass by its season, else the service kind of its first live line, else
 * the kind of its first visit. Two queries for all the non-pass jobs, one on the lines (with the service they were priced from)
 * and one on the visits, both oldest first and scoped to the organization. The one loader the live shaping and the API handlers share.
 */
export async function loadJobKinds(db: Database, organizationId: string, jobs: readonly { id: string; season: number | null }[]): Promise<Map<string, JobKind>> {
  const out = new Map<string, JobKind>()
  const others = jobs.filter((j) => j.season === null)
  for (const j of jobs) if (j.season !== null) out.set(j.id, "pass")
  if (others.length === 0) return out
  const ids = others.map((j) => j.id)
  const byId = ids.length <= ID_LIST_LIMIT
  const [lines, visits] = await Promise.all([
    db
      .select({ jobId: s.lineItem.jobId, serviceKind: s.service.kind, cancelledAt: s.lineItem.cancelledAt })
      .from(s.lineItem)
      .leftJoin(s.service, eq(s.service.id, s.lineItem.serviceId))
      .where(and(eq(s.lineItem.organizationId, organizationId), byId ? inArray(s.lineItem.jobId, ids) : undefined))
      .orderBy(asc(s.lineItem.createdAt), asc(s.lineItem.id)),
    db
      .select({ jobId: s.visit.jobId, kind: s.visit.kind })
      .from(s.visit)
      .where(and(eq(s.visit.organizationId, organizationId), byId ? inArray(s.visit.jobId, ids) : undefined))
      .orderBy(asc(s.visit.createdAt), asc(s.visit.id)),
  ])
  const linesOf = new Map<string, { serviceKind: string | null; cancelledAt: Date | null }[]>()
  for (const l of lines) linesOf.set(l.jobId, [...(linesOf.get(l.jobId) ?? []), { serviceKind: l.serviceKind, cancelledAt: l.cancelledAt }])
  const visitsOf = new Map<string, string[]>()
  for (const v of visits) visitsOf.set(v.jobId, [...(visitsOf.get(v.jobId) ?? []), v.kind])
  for (const j of others) out.set(j.id, jobKindOf({ season: null, lines: linesOf.get(j.id) ?? [], visitKinds: visitsOf.get(j.id) ?? [] }))
  return out
}

/** One job's derived kind. */
export async function loadJobKind(db: Database, organizationId: string, job: { id: string; season: number | null }): Promise<JobKind> {
  return (await loadJobKinds(db, organizationId, [job])).get(job.id)!
}
