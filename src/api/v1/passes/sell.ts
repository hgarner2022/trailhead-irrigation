import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import * as s from "@/db/schema"
import { readAppUrl } from "@/lib/env"
import { cleanText } from "@/lib/format/contact"
import { enqueueGeocode } from "@/lib/geocode"
import { currentSeason } from "@/lib/pass/season"
import { markPassActive } from "@/lib/pass/server/activate"
import { holdOfficeDays } from "@/lib/pass/server/chosen-days"
import { makePassRows } from "@/lib/pass/server/rows"
import { visitsOnSale } from "@/lib/season-pass"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { getStripe } from "@/lib/stripe/client"
import { ensureStripeCustomer } from "@/lib/stripe/customer"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { cleanContact } from "../customers/handlers"
import { today } from "../shared"
import { finishPurchase } from "./finish"
import { loadPass, passDetail, recordChange } from "./queries"
import { PassDetail, passSellInput } from "./schemas"

export const passesSell = defineHandler({
  name: "passes.sell",
  method: "POST",
  path: "/passes/sell",
  scope: "write",
  status: 201,
  summary:
    "Sell a Season Pass from the office, by phone or at the door: the same rows a website sale makes (the job with source office, the pass active from the start, its two or three visits, the consent with source admin, the pass-onboard task and the purchase confirmation), with no card step. Give an existing customer or a new one; email is required, since the confirmation goes by email. Each day given goes through the same rules as a move (a day not open goes to the next open one, recorded as day-filled). `paysBy` card-link puts a link to add the card in the confirmation; at-visit leaves the pass with no card, and Done asks how each visit was paid.",
  input: passSellInput,
  output: PassDetail,
  async run(ctx, input) {
    if (!input.customerId === !input.newCustomer) throw new ApiError("invalid", "Choose an existing customer or add a new one", [{ path: "customerId", message: "Give a customer or a newCustomer, not both" }])
    const org = ctx.organizationId
    const day = today(ctx)
    const onSale = visitsOnSale(input.inspection, day)
    if (onSale.length === 0) throw new ApiError("unprocessable", "No visits are on sale this season any more")
    const season = currentSeason(day)

    let customer: typeof s.customer.$inferSelect
    let property: typeof s.property.$inferSelect
    if (input.newCustomer) {
      const { property: address, accessNote: _a, ...fields } = input.newCustomer
      void _a
      ;[customer] = (await ctx.db.insert(s.customer).values({ organizationId: org, ...fields, ...cleanContact(fields), leadSource: "office" }).returning()) as [typeof s.customer.$inferSelect]
      ;[property] = (await ctx.db.insert(s.property).values({ organizationId: org, customerId: customer.id, address: cleanText(address.address), town: address.town }).returning()) as [typeof s.property.$inferSelect]
      await enqueueGeocode(ctx.db, org, property.id, ctx.now)
    } else {
      const [known] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, input.customerId!), eq(s.customer.organizationId, org)))
      if (!known) throw notFound("Customer")
      customer = known
      if (!customer.email) {
        if (!input.email) throw new ApiError("invalid", "This customer has no email on file. Add one: the confirmation and the pass card go by email", [{ path: "email", message: "An email is needed" }])
        ;[customer] = (await ctx.db.update(s.customer).set({ ...cleanContact({ email: input.email }), updatedAt: ctx.now }).where(eq(s.customer.id, known.id)).returning()) as [typeof s.customer.$inferSelect]
      }
      const props = await ctx.db.select().from(s.property).where(and(eq(s.property.customerId, customer.id), eq(s.property.organizationId, org)))
      const found = input.propertyId ? props.find((p) => p.id === input.propertyId) : props[0]
      if (!found) throw new ApiError("unprocessable", "This customer has no address on file; add one first")
      property = found
    }
    const [held] = await ctx.db
      .select({ number: s.seasonPass.number })
      .from(s.seasonPass)
      .where(and(eq(s.seasonPass.customerId, customer.id), eq(s.seasonPass.season, season), inArray(s.seasonPass.status, ["active", "pending"])))
    if (held) throw new ApiError("unprocessable", `${customer.firstName} already holds the ${season} Season Pass, ${held.number}`)

    const accessNote = input.newCustomer?.accessNote ? cleanText(input.newCustomer.accessNote) : null
    const pass = await makePassRows(ctx.db, { organizationId: org, customerId: customer.id, propertyId: property.id, season, onSale, zones: input.zones, inspection: input.inspection, accessNote, status: "active", source: "office", now: ctx.now })
    if (input.notes) await ctx.db.update(s.job).set({ notes: input.notes }).where(eq(s.job.id, pass.jobId))
    const heldDays = await holdOfficeDays(ctx.db, pass.id, input.days, property.town, season, day)
    await markPassActive(ctx.db, pass, null, ctx.now)
    await recordChange(ctx, { customerId: customer.id, passId: pass.id, kind: "sold", detail: { source: "office", paysBy: input.paysBy, days: heldDays } })

    // Card on file: the confirmation carries the same link "Send card link" sends, on a Stripe customer made now when the person has none.
    let cardUpdateUrl: string | null = null
    if (input.paysBy === "card-link") {
      const stripe = getStripe()
      const stripeCustomerId = await ensureStripeCustomer(ctx.db, stripe, customer.id, ctx.now)
      cardUpdateUrl = (await createCardUpdateSession(stripe, { passId: pass.id, customerId: stripeCustomerId, origin: readAppUrl() })).url
    }
    // The terms were read to the customer; nothing about marketing was asked, so none is recorded.
    await finishPurchase(ctx, pass, property.town, { marketingOptIn: false, marketingChannels: [], source: "admin" }, { cardUpdateUrl })
    return passDetail(ctx, await loadPass(ctx, pass.id))
  },
})
