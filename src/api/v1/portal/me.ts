import "server-only"
import { and, eq, isNotNull } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { customerHasCard } from "@/lib/customer/card"
import { changedFields } from "@/lib/events/diff"
import { recordEvent, whoOf } from "@/lib/events/record"
import { readAppUrl } from "@/lib/env"
import { getStripe } from "@/lib/stripe/client"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { ensureStripeCustomer } from "@/lib/stripe/customer"
import { ApiError, notFound } from "../../core/errors"
import type { Ctx } from "../../core/context"
import { defineHandler } from "../../core/handler"
import { cleanContact, cleanYard } from "../customers/handlers"
import { customerFields, yardFields } from "../customers/schemas"
import { Id } from "../shared"
import { selfCustomerId } from "./self"
import { PortalCustomer } from "./schemas"

/** The signed-in customer's id; every call below is for them and for no one else, so a key or an admin is refused. */
function mine(ctx: Ctx): string {
  const id = selfCustomerId(ctx)
  if (!id) throw new ApiError("forbidden", "This call is for a signed-in customer's own account")
  return id
}

/** The customer, their properties with every yard fact they know best (never the office's property notes), and the card on file. */
async function view(ctx: Ctx, customerId: string) {
  const [row] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, customerId), eq(s.customer.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Customer")
  const properties = await ctx.db.select().from(s.property).where(and(eq(s.property.customerId, customerId), eq(s.property.organizationId, ctx.organizationId))).orderBy(s.property.createdAt, s.property.id)
  const passes = await ctx.db.select({ id: s.job.id }).from(s.job).where(and(eq(s.job.customerId, customerId), eq(s.job.organizationId, ctx.organizationId), isNotNull(s.job.season), isNotNull(s.job.soldOn))).limit(1)
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    hasHeldPass: passes.length > 0,
    card: customerHasCard(row) ? { brand: row.cardBrand, last4: row.cardLast4, expires: row.cardExpires, failedAt: row.cardFailedAt?.toISOString() ?? null } : null,
    properties: properties.map((p) => ({ id: p.id, address: p.address, town: p.town, zones: p.zones, controller: p.controller, backflowLocation: p.backflowLocation, gateCode: p.gateCode, mustBeHome: p.mustBeHome, accessNote: p.accessNote, contactName: p.contactName, contactPhone: p.contactPhone })),
  }
}

export const customersMe = defineHandler({
  name: "customers.me",
  method: "GET",
  path: "/me",
  scope: "read",
  customerSelf: true,
  summary: "The signed-in customer's own account: name, mobile, email, their properties with the yard facts, the card on file, and whether they have ever held a Season Pass. Only for a signed-in customer.",
  input: z.object({}),
  output: PortalCustomer,
  async run(ctx) {
    return view(ctx, mine(ctx))
  },
})

export const customersUpdateSelf = defineHandler({
  name: "customers.updateSelf",
  method: "PATCH",
  path: "/me",
  scope: "write",
  customerSelf: true,
  summary: "A customer changes their own name or mobile. The email on the account is not changed here (the office does that), so a sign-in link only ever goes to an address we have on record.",
  input: z.object({ firstName: customerFields.firstName.optional(), lastName: customerFields.lastName, phone: customerFields.phone }),
  output: PortalCustomer,
  async run(ctx, input) {
    const id = mine(ctx)
    const [before] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, id), eq(s.customer.organizationId, ctx.organizationId)))
    if (!before) throw notFound("Customer")
    const set = Object.fromEntries(Object.entries(cleanContact(input)).filter(([, v]) => v !== undefined))
    if (Object.keys(set).length) {
      await ctx.db.update(s.customer).set({ ...set, updatedAt: ctx.now }).where(and(eq(s.customer.id, id), eq(s.customer.organizationId, ctx.organizationId)))
      const changed = changedFields(before, set)
      if (Object.keys(changed).length) await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "customer", aboutId: id, customerId: id, kind: "customer.edited", detail: { changed }, who: whoOf(ctx), at: ctx.now })
    }
    return view(ctx, id)
  },
})

/** The yard facts a customer may write: the yard's own fields, not the office's property notes. */
const customerYardFields = z.object(yardFields).omit({ notes: true }).shape

export const propertiesUpdateSelf = defineHandler({
  name: "properties.updateSelf",
  method: "PATCH",
  path: "/me/properties/{id}",
  scope: "write",
  customerSelf: true,
  summary: "A customer changes the yard facts of their own property: zones, controller, backflow location, gate code, whether someone must be home, the access note and the on-site contact. The street address and the office's notes are not changed here.",
  input: z.object({ id: Id, ...customerYardFields }),
  output: PortalCustomer,
  async run(ctx, { id, ...changes }) {
    const customerId = mine(ctx)
    const where = and(eq(s.property.id, id), eq(s.property.organizationId, ctx.organizationId), eq(s.property.customerId, customerId))
    const [row] = await ctx.db.select().from(s.property).where(where)
    if (!row) throw notFound("Property")
    const set = cleanYard(changes)
    if (Object.keys(set).length) {
      await ctx.db.update(s.property).set({ ...set, updatedAt: ctx.now }).where(where)
      const changed = changedFields(row, set)
      if (Object.keys(changed).length) await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "property", aboutId: id, customerId, kind: "property.edited", detail: { changed }, who: whoOf(ctx), at: ctx.now })
    }
    return view(ctx, customerId)
  },
})

export const customersStartCardUpdate = defineHandler({
  name: "customers.startCardUpdate",
  method: "POST",
  path: "/me/card-update",
  scope: "write",
  customerSelf: true,
  summary: "Open Stripe's hosted page for the signed-in customer to update the card on file, or add one, and return its address. The link is good for 24 hours. It names the customer, not a pass, so a customer with no pass can use it.",
  input: z.object({}),
  output: z.object({ url: z.string().url() }),
  async run(ctx) {
    const id = mine(ctx)
    const stripe = getStripe()
    const session = await createCardUpdateSession(stripe, { appCustomerId: id, customerId: await ensureStripeCustomer(ctx.db, stripe, id, ctx.now, ctx.organizationId), origin: readAppUrl() })
    return { url: session.url }
  },
})
