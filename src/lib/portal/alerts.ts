import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Ctx } from "@/api/core/context"
import { visitName } from "@/lib/events/names"
import { readAppUrl } from "@/lib/env"
import { firstNameOf } from "@/lib/admin/people"
import { queueStaffMessage } from "@/lib/messaging/queue"
import { shortDay } from "./words"

/** The alert kind on Home for a change a customer made from their own account. */
export const CUSTOMER_CHANGED = "customer-changed"

export interface CustomerChange {
  change: "cancelled" | "moved"
  customerName: string
  /** "Spring turn-on" */
  service: string
  town: string
  /** the day the visit was on, when it had one */
  from: string | null
  /** the day it moved to */
  to?: string | null
  /** the person who has it now (a move) */
  who?: string | null
  /** the job holds a payment, so Ryan has money to sort out */
  hasPayment?: boolean
}

/** The Home line (and the email's detail) for a customer's change, in Ryan's words: "Andrea Smith canceled Spring turn-on, Tue, Apr 28, Erie. The day is free." */
export function customerChangeMessage(c: CustomerChange): string {
  if (c.change === "moved") {
    const range = c.from && c.to ? `from ${shortDay(c.from)} to ${shortDay(c.to)}` : c.to ? `to ${shortDay(c.to)}` : ""
    return `${c.customerName} moved ${c.service}${range ? ` ${range}` : ""}, ${c.town}${c.who ? `, ${firstNameOf(c.who)}` : ""}.`
  }
  return `${c.customerName} canceled ${c.service}${c.from ? `, ${shortDay(c.from)}` : ""}, ${c.town}.${c.from ? " The day is free." : ""}${c.hasPayment ? " The job has a payment." : ""}`
}

/**
 * Tells the office a customer changed their own visit: one Home row (`admin_alert`, kind `customer-changed`, shown until dismissed) and
 * one email to the owner and admins through the staff message path. A cancel or a move is one row each, so a second move of the same
 * visit is a second row.
 */
export async function alertCustomerChange(ctx: Ctx, visit: { id: string; kind: string; jobId: string; customerId: string; propertyId: string }, change: Pick<CustomerChange, "change" | "from" | "to" | "who" | "hasPayment">): Promise<void> {
  const [row] = await ctx.db
    .select({ first: s.customer.firstName, last: s.customer.lastName, town: s.property.town })
    .from(s.customer)
    .innerJoin(s.property, eq(s.property.id, visit.propertyId))
    .where(eq(s.customer.id, visit.customerId))
  if (!row) return
  const full: CustomerChange = { ...change, customerName: [row.first, row.last].filter(Boolean).join(" "), service: visitName(visit.kind), town: row.town }
  const message = customerChangeMessage(full)
  const key = `${visit.id}:${change.change}:${ctx.now.toISOString()}`
  await ctx.db.insert(s.adminAlert).values({ organizationId: ctx.organizationId, kind: CUSTOMER_CHANGED, key, jobId: visit.jobId, message }).onConflictDoNothing()
  await queueStaffMessage(ctx.db, ctx.organizationId, "admin-alert", `${CUSTOMER_CHANGED}:${key}`, {
    origin: readAppUrl(),
    title: `${full.customerName} ${change.change === "moved" ? "moved" : "canceled"} ${full.service}`,
    detail: message,
    path: `/admin/visits?visit=${encodeURIComponent(visit.id)}`,
  })
}
