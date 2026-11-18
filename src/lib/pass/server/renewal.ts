import "server-only"
import { and, eq, isNotNull, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { PersonPrincipal } from "@/lib/auth/types"
import { verifyToken } from "@/lib/messaging/tokens"
import { currentSeason } from "../season"
import { passInspection, passStatus } from "../facts"
import { resolvePassJobAnywhere } from "./resolve"
import type { RenewalPrefill } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-submit"

/**
 * Whether this visitor may renew this pass: they came by its signed link, or they are signed in as the pass's own customer.
 * `passId` is the id exactly as it arrived in the link (a job id, or the old pass id of a link sent before the move): the signature
 * is over that text, so it is checked before the id is resolved.
 */
export function mayRenew(pass: { customerId: string }, who: { passId: string; token?: string | null; principal?: PersonPrincipal | null }): boolean {
  if (verifyToken("renew-pass", who.passId, who.token ?? null)) return true
  const p = who.principal
  return p?.type === "customer" && p.customerId === pass.customerId
}

/**
 * What the checkout fills in for a renewal, or null when it should open as an ordinary checkout: the pass is not found, the
 * visitor may not renew it, it is pending or cancelled, or its customer already holds the next season. Nothing leaves here for a
 * visitor who is not the pass's own customer. The zones, the access answers and the yard come from the property, the add-on from
 * the pass's lines.
 */
export async function loadRenewal(db: Database, input: { passId: string; token?: string | null; principal?: PersonPrincipal | null; today: string }): Promise<RenewalPrefill | null> {
  const job = await resolvePassJobAnywhere(db, input.passId)
  const status = job ? passStatus(job, input.today) : null
  if (!job || status === "pending" || status === "cancelled" || !mayRenew(job, input)) return null
  const season = Math.max(currentSeason(input.today), (job.season ?? 0) + 1)
  const [held] = await db
    .select({ id: s.job.id })
    .from(s.job)
    .where(and(eq(s.job.organizationId, job.organizationId), eq(s.job.customerId, job.customerId), isNotNull(s.job.season), eq(s.job.season, season), isNull(s.job.cancelledAt)))
  if (held) return null
  const [row] = await db
    .select({ customer: s.customer, property: s.property })
    .from(s.customer)
    .innerJoin(s.property, eq(s.property.id, job.propertyId))
    .where(eq(s.customer.id, job.customerId))
  if (!row) return null
  const lines = await db.select({ name: s.lineItem.name, serviceId: s.lineItem.serviceId, cancelledAt: s.lineItem.cancelledAt }).from(s.lineItem).where(eq(s.lineItem.jobId, job.id))
  const { customer, property } = row
  return {
    // As it arrived, so the signed link still verifies when the checkout sends it back with the answers.
    passId: input.passId,
    season,
    ...(input.token ? { token: input.token } : {}),
    firstName: customer.firstName,
    ...(customer.lastName ? { lastName: customer.lastName } : {}),
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    place: { id: `property-${property.id}`, label: `${property.address}, ${property.town}, CO`, line1: property.address, town: property.town, state: "CO", zip: "" },
    zones: property.zones ?? 0,
    inspection: passInspection(lines),
    needsCustomerHome: property.mustBeHome,
    accessNote: property.accessNote ?? "",
    card: customer.stripePaymentMethodId && customer.cardLast4 ? { last4: customer.cardLast4, expires: customer.cardExpires } : null,
  }
}
