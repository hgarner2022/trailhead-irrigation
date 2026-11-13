import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { PersonPrincipal } from "@/lib/auth/types"
import { verifyToken } from "@/lib/messaging/tokens"
import { currentSeason } from "../season"
import type { RenewalPrefill } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-submit"

/** Whether this visitor may renew this pass: they came by its signed link, or they are signed in as the pass's own customer. */
export function mayRenew(pass: { id: string; customerId: string }, who: { token?: string | null; principal?: PersonPrincipal | null }): boolean {
  if (verifyToken("renew-pass", pass.id, who.token ?? null)) return true
  const p = who.principal
  return p?.type === "customer" && p.customerId === pass.customerId
}

/**
 * What the checkout fills in for a renewal, or null when it should open as an ordinary checkout: the pass is not found, the
 * visitor may not renew it, it is pending or cancelled, or its customer already holds the next season. Nothing leaves here for a
 * visitor who is not the pass's own customer.
 */
export async function loadRenewal(db: Database, input: { passId: string; token?: string | null; principal?: PersonPrincipal | null; today: string }): Promise<RenewalPrefill | null> {
  const [row] = await db
    .select({ pass: s.seasonPass, customer: s.customer, property: s.property })
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .innerJoin(s.property, eq(s.property.id, s.seasonPass.propertyId))
    .where(eq(s.seasonPass.id, input.passId))
  if (!row || row.pass.status === "pending" || row.pass.status === "cancelled" || !mayRenew(row.pass, input)) return null
  const season = Math.max(currentSeason(input.today), row.pass.season + 1)
  const [held] = await db.select({ id: s.seasonPass.id }).from(s.seasonPass).where(and(eq(s.seasonPass.customerId, row.pass.customerId), eq(s.seasonPass.season, season), inArray(s.seasonPass.status, ["active", "pending"])))
  if (held) return null
  const { pass, customer, property } = row
  return {
    passId: pass.id,
    season,
    ...(input.token ? { token: input.token } : {}),
    firstName: customer.firstName,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    place: { id: `property-${property.id}`, label: `${property.address}, ${property.town}, CO`, line1: property.address, town: property.town, state: "CO", zip: "" },
    zones: pass.zones,
    inspection: pass.inspection,
    needsCustomerHome: pass.needsCustomerHome,
    accessNote: pass.accessNote ?? "",
    card: pass.stripePaymentMethodId && pass.cardLast4 ? { last4: pass.cardLast4, expires: pass.cardExpires } : null,
  }
}
