import "server-only"
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import { hasScope } from "@/lib/auth/principal"
import { whoOf } from "@/lib/events/record"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { selfCustomerId } from "../portal/self"
import type { PhotoOutType } from "./schemas"

// Who may see, add and delete a photo. One place, read by `photos.*`, the upload-token route and the serving route, so they never disagree:
//   staff with the write scope (an owner, a manager, a write key): every photo of the organization;
//   a tech: the visits they have had (the visit's person is them), their own uploads and nothing else;
//   a read key: reads every photo, adds nothing;
//   a customer (signed in, or by a text's link for that one visit): their own visits; their own uploads, and the staff photos marked
//   shown-to-customer once the visit is Done.

export type PhotoRow = typeof s.photo.$inferSelect
export type VisitRow = Pick<typeof s.visit.$inferSelect, "id" | "organizationId" | "jobId" | "customerId" | "personId" | "status" | "kind">

export const isTech = (ctx: Ctx) => ctx.principal.kind === "person" && ctx.principal.type === "admin" && ctx.principal.role === "tech"
const isOwnerLike = (ctx: Ctx) => {
  const p = ctx.principal
  if (p.kind === "person") return p.type === "admin" && p.role === "owner"
  return p.kind === "api-key" && p.scopes.includes("admin")
}

export async function loadVisitRow(ctx: Ctx, visitId: string): Promise<VisitRow> {
  const [row] = await ctx.db
    .select({ id: s.visit.id, organizationId: s.visit.organizationId, jobId: s.visit.jobId, customerId: s.visit.customerId, personId: s.visit.personId, status: s.visit.status, kind: s.visit.kind })
    .from(s.visit)
    .where(and(eq(s.visit.id, visitId), eq(s.visit.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Visit")
  return row
}

/** Whether the signed-in tech is the person on this visit (matched by email, like a tech's other records). */
async function techHadVisit(ctx: Ctx, visit: VisitRow): Promise<boolean> {
  const p = ctx.principal
  if (p.kind !== "person" || !visit.personId) return false
  const [row] = await ctx.db
    .select({ id: s.person.id })
    .from(s.person)
    .where(and(eq(s.person.id, visit.personId), eq(s.person.organizationId, ctx.organizationId), sql`lower(${s.person.email}) = lower(${p.email})`))
  return Boolean(row)
}

/** The caller is the customer this visit belongs to. */
export const isOwnCustomer = (ctx: Ctx, visit: Pick<VisitRow, "customerId">) => selfCustomerId(ctx) === visit.customerId

/** Throws unless the caller may read this visit's photos. */
export async function assertCanRead(ctx: Ctx, visit: VisitRow): Promise<void> {
  const p = ctx.principal
  if (p.kind === "public") throw new ApiError("forbidden", "Photos are not open to this caller")
  if (p.kind === "person" && p.type === "customer") {
    if (!isOwnCustomer(ctx, visit)) throw new ApiError("forbidden", "That visit belongs to another customer")
    return
  }
  if (hasScope(p, "write") || (p.kind === "api-key" && hasScope(p, "read"))) return
  if (isTech(ctx) && (await techHadVisit(ctx, visit))) return
  throw new ApiError("forbidden", "Photos are for the person who had the visit")
}

/** Throws unless the caller may add a photo to this visit. */
export async function assertCanAdd(ctx: Ctx, visit: VisitRow): Promise<void> {
  const p = ctx.principal
  if (p.kind === "public") throw new ApiError("forbidden", "Photos are not open to this caller")
  if (p.kind === "person" && p.type === "customer") {
    if (!isOwnCustomer(ctx, visit)) throw new ApiError("forbidden", "That visit belongs to another customer")
    if (visit.status === "cancelled" || visit.status === "skipped") throw new ApiError("unprocessable", "This visit was canceled")
    return
  }
  if (hasScope(p, "write")) return
  if (isTech(ctx) && (await techHadVisit(ctx, visit))) return
  if (p.kind === "api-key") throw new ApiError("forbidden", "A read key cannot add photos")
  throw new ApiError("forbidden", "Photos are for the person who had the visit")
}

/** Whether a customer reads this photo: their own upload, or a staff photo marked shown once the visit is Done. */
export const customerSees = (photo: Pick<PhotoRow, "addedBy" | "shownToCustomer">, visit: Pick<VisitRow, "status">) =>
  photo.addedBy === "customer" || (photo.shownToCustomer && visit.status === "completed")

/** Whether the caller may delete this photo: the person who added it, an owner (or a key with the admin scope), the customer for their own. */
export function mayRemove(ctx: Ctx, photo: Pick<PhotoRow, "addedBy" | "customerId">): boolean {
  const p = ctx.principal
  if (p.kind === "person" && p.type === "customer") return photo.addedBy === "customer" && photo.customerId === p.customerId
  if (p.kind === "public") return false
  return isOwnerLike(ctx) || photo.addedBy === whoOf(ctx)
}

/** The photo rows of some visits, oldest first, never a deleted one, always inside the organization. */
export async function photoRowsOf(ctx: Ctx, where: { visitIds?: string[]; jobId?: string }): Promise<PhotoRow[]> {
  if (where.visitIds && where.visitIds.length === 0) return []
  return ctx.db
    .select()
    .from(s.photo)
    .where(
      and(
        eq(s.photo.organizationId, ctx.organizationId),
        isNull(s.photo.deletedAt),
        where.visitIds ? inArray(s.photo.visitId, where.visitIds) : undefined,
        where.jobId ? eq(s.photo.jobId, where.jobId) : undefined,
      ),
    )
    .orderBy(asc(s.photo.createdAt), asc(s.photo.id))
}

/** The names of the people behind some staff `added_by` emails, in one query. */
async function namesOf(ctx: Ctx, emails: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (emails.length === 0) return out
  const rows = await ctx.db
    .select({ email: s.person.email, name: s.person.name })
    .from(s.person)
    .where(and(eq(s.person.organizationId, ctx.organizationId), inArray(sql`lower(${s.person.email})`, emails.map((e) => e.toLowerCase()))))
  for (const r of rows) if (r.email) out.set(r.email.toLowerCase(), r.name)
  return out
}

/** Rows as the API shows them to this caller; a customer is left only the photos `customerSees` allows and never learns a staff email. */
export async function shapePhotos(ctx: Ctx, rows: PhotoRow[], visits: Map<string, Pick<VisitRow, "status">>): Promise<PhotoOutType[]> {
  const customer = ctx.principal.kind === "person" && ctx.principal.type === "customer"
  const seen = customer ? rows.filter((r) => customerSees(r, visits.get(r.visitId) ?? { status: "unscheduled" })) : rows
  const names = customer ? new Map<string, string>() : await namesOf(ctx, [...new Set(seen.map((r) => r.addedBy).filter((w) => w.includes("@")))])
  return seen.map((r) => ({
    id: r.id,
    visitId: r.visitId,
    jobId: r.jobId,
    customerId: r.customerId,
    url: `/api/photos/${r.id}`,
    contentType: r.contentType,
    bytes: r.bytes,
    addedBy: customer ? (r.addedBy === "customer" ? "customer" : "staff") : r.addedBy,
    addedByName: customer ? null : (names.get(r.addedBy.toLowerCase()) ?? null),
    byCustomer: r.addedBy === "customer",
    shownToCustomer: r.shownToCustomer,
    canRemove: mayRemove(ctx, r),
    createdAt: r.createdAt.toISOString(),
  }))
}
