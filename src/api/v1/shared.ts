import "server-only"
import { z } from "zod"
import * as s from "@/db/schema"
import type { Ctx } from "../core/context"
import { ApiError } from "../core/errors"
import { hasScope } from "@/lib/auth/principal"
import type { CapacityKind, Weekday } from "@/lib/admin/types"

export const Id = z.string().min(1).describe("An id.")
export const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").describe("A Mountain-time calendar day, YYYY-MM-DD.")
export const Iso = z.string().describe("An ISO 8601 timestamp.")
export const Town = z.enum(s.townEnum.enumValues)
export const VisitKind = z.enum(s.visitKindEnum.enumValues)
export const VisitStatus = z.enum(s.visitStatusEnum.enumValues)
export const PassStatus = z.enum(s.passStatusEnum.enumValues)
export const Preference = z.enum(s.timingPreferenceEnum.enumValues)
export const Channel = z.enum(["email", "sms"])
export const idInput = z.object({ id: Id })
export const okOutput = z.object({ ok: z.literal(true) })
export const OK = { ok: true } as const

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined)

const mountain = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" })
/** The Mountain-time calendar day of an instant. */
export const mountainDay = (d: Date) => mountain.format(d)
export const today = (ctx: Ctx) => mountainDay(ctx.now)

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
/** The weekday of a YYYY-MM-DD day. */
export const weekdayOf = (day: string): Weekday => WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]!
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** The kind a truck's capacity is counted in; installs and the rest ride under "other". */
export const capacityKind = (kind: (typeof s.visitKindEnum.enumValues)[number]): CapacityKind =>
  kind === "turn-on" || kind === "inspection" || kind === "blowout" || kind === "repair" ? kind : "other"

/** Contact details (emails, phones, addresses, access notes) are for people and keys that may write. */
export const canSeeContact = (ctx: Ctx) => hasScope(ctx.principal, "write")

/** Who made a change, for the change rows. */
export const byPrincipal = (ctx: Ctx) => (ctx.principal.kind === "person" ? ctx.principal.email : `api-key:${ctx.principal.id}`)

/** A customer may touch only their own records; anyone with a scope may read any record in the organization. */
export function assertOwnsCustomer(ctx: Ctx, customerId: string) {
  if (hasScope(ctx.principal, "read")) return
  const p = ctx.principal
  if (!(p.kind === "person" && p.type === "customer" && p.customerId === customerId))
    throw new ApiError("forbidden", "That record belongs to another customer")
}

export const isAdminCaller = (ctx: Ctx) => hasScope(ctx.principal, "write")
