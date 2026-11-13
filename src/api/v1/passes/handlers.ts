import "server-only"
import { and, desc, eq, notInArray, or, sql } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { enqueueGeocode } from "@/lib/geocode"
import { currentSeason } from "@/lib/pass/season"
import { nextPassNumber } from "@/lib/pass/number"
import { SEASON_PASS_ADD_ON, visitPrice, visitsOnSale } from "@/lib/season-pass"
import { hasScope } from "@/lib/auth/principal"
import { readAppUrl } from "@/lib/env"
import { activatePass } from "@/lib/pass/server/activate"
import { emailDomainReachable, failedCheckoutStep, MAX_PENDING_PER_HOUR, newestPendingPass, pendingPassesLastHour } from "@/lib/pass/server/create"
import { cleanEmail, cleanName, cleanText, normalizePhone } from "@/lib/format/contact"
import { recordPurchase } from "@/lib/pass/server/purchase"
import { outOfAreaMessage } from "@/lib/places"
import { queueCardUpdateLink } from "@/lib/pass/server/card-link"
import { queueCancelledEmail } from "@/lib/pass/server/cancel"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { enqueue } from "@/lib/queue"
import { emitEvent } from "../webhooks/deliver"
import { getStripe } from "@/lib/stripe/client"
import type { Ctx } from "../../core/context"
import { ApiError, notImplemented } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { addDays, Id, idInput, OK, okOutput, PassStatus, Preference, Town, today } from "../shared"
import { PassDetail, PassOut, passActivateInput, passCreateInput } from "./schemas"
import { loadPass, passDetail, passesQuery, passOut, recordChange } from "./queries"

const WINDOW_LABEL = { "turn-on": "May", inspection: "July", blowout: "October" } as const
const PassVisitKind = z.enum(["turn-on", "inspection", "blowout"])
const OPEN = ["pending", "active"] as const

/** The customer behind a signed-in customer's call; only reached when the caller has no `read` scope. */
function ownCustomerId(ctx: Ctx): string {
  const p = ctx.principal
  if (p.kind === "person" && p.type === "customer" && p.customerId) return p.customerId
  throw new ApiError("forbidden", "This call needs the read scope")
}

export const passesList = defineHandler({
  name: "passes.list",
  method: "GET",
  path: "/passes",
  scope: "read",
  customerSelf: true,
  summary: "List passes, newest first. Filter by season, status, town or a timing preference. A customer lists only their own.",
  input: z.object({
    season: z.coerce.number().int().optional(),
    status: PassStatus.optional(),
    town: Town.optional(),
    preference: Preference.optional().describe("Matches the turn-on or the blowout preference."),
    ...pageInput,
  }),
  output: page(PassOut),
  async run(ctx, input) {
    const rows = await passesQuery(ctx)
      .where(
        and(
          eq(s.seasonPass.organizationId, ctx.organizationId),
          hasScope(ctx.principal, "read") ? undefined : eq(s.seasonPass.customerId, ownCustomerId(ctx)),
          input.season ? eq(s.seasonPass.season, input.season) : undefined,
          input.status ? eq(s.seasonPass.status, input.status) : undefined,
          input.town ? eq(s.property.town, input.town) : undefined,
          input.preference ? or(eq(s.seasonPass.turnOnPreference, input.preference), eq(s.seasonPass.blowoutPreference, input.preference)) : undefined,
          afterTimeCursor(s.seasonPass.createdAt, s.seasonPass.id, input.cursor),
        ),
      )
      .orderBy(desc(s.seasonPass.createdAt), desc(s.seasonPass.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, (r) => timeCursor(r.pass))
    return { data: result.data.map((r) => passOut(ctx, r)), next_cursor: result.next_cursor }
  },
})

export const passesGet = defineHandler({
  name: "passes.get",
  method: "GET",
  path: "/passes/{id}",
  scope: "read",
  customerSelf: true,
  summary: "One pass with its visits, charges and current consent. A customer reads only their own.",
  input: idInput,
  output: PassDetail,
  async run(ctx, input) {
    return passDetail(ctx, await loadPass(ctx, input.id))
  },
})

export const passesCreate = defineHandler({
  name: "passes.create",
  method: "POST",
  path: "/passes",
  scope: "write",
  checkout: true,
  status: 201,
  summary: "Create the checkout's pending pass: the customer, the property and one visit for each visit still on sale this season. Given the `passId` of a pending pass for the same email it updates that pass instead. The anonymous checkout is also held to the checkout's own step rules, an email whose domain has a mail server and three new passes per email per hour.",
  input: passCreateInput,
  output: PassDetail,
  async run(ctx, input) {
    const day = today(ctx)
    const onSale = visitsOnSale(input.inspection, day)
    if (onSale.length === 0) throw new ApiError("unprocessable", "No visits are on sale this season any more")
    const season = currentSeason(day)
    const org = ctx.organizationId
    const email = cleanEmail(input.customer.email)
    // Stored the way they print: "hannah garner" as Hannah Garner, the phone in one standard form, notes without stray spaces.
    const contact = { firstName: cleanName(input.customer.firstName), email, phone: normalizePhone(input.customer.phone) ?? input.customer.phone ?? null }
    const accessNote = input.accessNote ? cleanText(input.accessNote) : null
    const visitor = ctx.principal.kind === "public"
    if (visitor) {
      const step = failedCheckoutStep({ property: input.property, zones: input.zones, needsCustomerHome: input.needsCustomerHome, customer: { ...input.customer, email }, today: day })
      if (step === "address") throw new ApiError("unprocessable", outOfAreaMessage({ ok: false, place: input.property.town }), [{ path: "reason", message: "out-of-area" }])
      if (step) throw new ApiError("invalid", `The ${step} step is not complete`, [{ path: "reason", message: step }])
      if (!(await emailDomainReachable(email))) throw new ApiError("unprocessable", "We can't find that email's mail server. Check the spelling.", [{ path: "reason", message: "email-unreachable" }])
    }
    const [known] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.organizationId, org), sql`lower(${s.customer.email}) = ${email}`)).limit(1)
    const [held] = input.passId ? await ctx.db.select().from(s.seasonPass).where(and(eq(s.seasonPass.id, input.passId), eq(s.seasonPass.organizationId, org))) : []
    // A customer who reloads or comes back later picks up their own pending pass (the newest one this hour) rather than
    // starting another: there is no cart to lose, and the hourly limit is then only ever reached by something odd.
    const [resumed] = visitor && known && !held ? await newestPendingPass(ctx.db, org, known.id, ctx.now) : []
    const candidate = held ?? resumed
    const reused = candidate && candidate.status === "pending" && known && candidate.customerId === known.id ? candidate : undefined
    if (visitor && !reused && known && (await pendingPassesLastHour(ctx.db, org, known.id, ctx.now)) >= MAX_PENDING_PER_HOUR)
      throw new ApiError("rate_limited", "Too many passes started for this email in the last hour. Try again later or call us.", [{ path: "reason", message: "too-many" }])
    const customerRow =
      known ??
      (await ctx.db.insert(s.customer).values({ organizationId: org, ...input.customer, ...contact, leadSource: input.customer.leadSource ?? "season-pass" }).returning())[0]!
    const { state: _state, zip: _zip, ...address } = { ...input.property, address: cleanText(input.property.address) }
    void _state
    void _zip
    const [knownProperty] = await ctx.db
      .select()
      .from(s.property)
      .where(and(eq(s.property.customerId, customerRow.id), eq(s.property.address, address.address), eq(s.property.town, address.town)))
      .limit(1)
    const property = knownProperty ?? (await ctx.db.insert(s.property).values({ organizationId: org, customerId: customerRow.id, ...address }).returning())[0]!
    if (!knownProperty) await enqueueGeocode(ctx.db, org, property.id, ctx.now)
    const [terms] = await ctx.db.select({ v: s.organization.termsVersion }).from(s.organization).where(eq(s.organization.id, org))

    const fields = {
      propertyId: property.id,
      zones: input.zones,
      inspection: input.inspection,
      turnOnPreference: input.turnOnPreference,
      blowoutPreference: input.blowoutPreference,
      needsCustomerHome: input.needsCustomerHome,
      accessNote,
    }
    let pass: typeof s.seasonPass.$inferSelect | undefined = reused
    if (reused) {
      // A customer who went back changes the answers on the pass they hold; its visits are rebuilt, none has a day yet.
      await ctx.db.update(s.seasonPass).set({ ...fields, season, updatedAt: ctx.now }).where(eq(s.seasonPass.id, reused.id))
      // Only the checkout that holds the pass id (the same browser going back) may change the customer's name and phone.
      // A resume by email alone reuses the pass but never rewrites who the customer is: anyone can type an email.
      if (held) await ctx.db.update(s.customer).set({ firstName: contact.firstName, phone: contact.phone ?? customerRow.phone, updatedAt: ctx.now }).where(eq(s.customer.id, customerRow.id))
      await ctx.db.delete(s.visit).where(eq(s.visit.passId, reused.id))
    }
    for (let attempt = 0; attempt < 3 && !pass; attempt++) {
      const numbers = await ctx.db.select({ n: s.seasonPass.number }).from(s.seasonPass).where(and(eq(s.seasonPass.organizationId, org), eq(s.seasonPass.season, season)))
      try {
        ;[pass] = await ctx.db
          .insert(s.seasonPass)
          .values({
            organizationId: org,
            number: nextPassNumber(season, numbers.map((r) => r.n)),
            season,
            customerId: customerRow.id,
            ...fields,
            status: "pending",
            createdAt: ctx.now,
          })
          .returning()
      } catch (error) {
        if (attempt === 2) throw error
      }
    }
    if (input.consent)
      await ctx.db.insert(s.consent).values({
        organizationId: org,
        customerId: customerRow.id,
        termsVersion: input.consent.termsVersion ?? terms?.v,
        termsAcceptedAt: ctx.now,
        marketingOptIn: input.consent.marketingOptIn,
        marketingChannels: input.consent.marketingChannels,
        source: input.consent.source,
        recordedAt: ctx.now,
        note: input.consent.note,
      })
    await ctx.db.insert(s.visit).values(
      onSale.map((v) => ({
        organizationId: org,
        passId: pass!.id,
        customerId: customerRow.id,
        propertyId: property.id,
        kind: v.key,
        window: WINDOW_LABEL[v.key],
        amount: visitPrice(v, input.zones),
        status: "unscheduled" as const,
        preference: v.key === "turn-on" ? input.turnOnPreference : v.key === "blowout" ? input.blowoutPreference : undefined,
        awaitingPick: input.needsCustomerHome,
      })),
    )
    return passDetail(ctx, await loadPass(ctx, pass!.id))
  },
})

export const passesActivate = defineHandler({
  name: "passes.activate",
  method: "POST",
  path: "/passes/{id}/activate",
  scope: "write",
  checkout: "own-pass",
  summary: "Activate a pending pass once its card is saved: stores the card from the finished setup session, makes the pass active, records the checkout's consent and queues the onboarding task and the purchase confirmation. Safe to call twice for one session.",
  input: passActivateInput,
  output: PassDetail,
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    await activatePass(ctx.db, getStripe(), row.pass.id, input.setupSessionId, ctx.now)
    await recordPurchase(ctx.db, row.pass.id, input.consent, readAppUrl(), ctx.now)
    return passDetail(ctx, await loadPass(ctx, input.id))
  },
})

export const passesCancel = defineHandler({
  name: "passes.cancel",
  method: "POST",
  path: "/passes/{id}/cancel",
  scope: "write",
  customerSelf: true,
  summary: "Cancel a pass and its visits that have not happened. Nothing further is charged, the customer is emailed, Home shows the cancellation and the Jobber routine removes the Jobber requests. A customer cancels only a pass their own email address holds.",
  input: z.object({ id: Id, reason: z.string().max(500).optional() }),
  output: z.object({ id: Id, status: z.literal("cancelled"), cancelledVisits: z.number().int() }),
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    const p = ctx.principal
    // A signed-in customer must hold the pass by email as well as by id; an admin or a key with the write scope may cancel any.
    if (!hasScope(p, "write") && p.kind === "person" && row.email && p.email.toLowerCase() !== row.email.toLowerCase())
      throw new ApiError("forbidden", "That pass belongs to another customer")
    if (row.pass.status === "cancelled") return { id: row.pass.id, status: "cancelled" as const, cancelledVisits: 0 }
    await ctx.db.update(s.seasonPass).set({ status: "cancelled", cancelledAt: ctx.now }).where(eq(s.seasonPass.id, row.pass.id))
    const cancelled = await ctx.db
      .update(s.visit)
      .set({ status: "cancelled", truckId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false })
      .where(and(eq(s.visit.passId, row.pass.id), notInArray(s.visit.status, ["completed", "cancelled"])))
      .returning({ id: s.visit.id })
    await recordChange(ctx, { customerId: row.pass.customerId, passId: row.pass.id, kind: "cancelled", detail: { reason: input.reason ?? null, visits: cancelled.length } })
    await enqueue(ctx.db, ctx.organizationId, "pass-cancel", row.pass.id, { passId: row.pass.id })
    await queueCancelledEmail(ctx.db, row.pass.id, readAppUrl())
    await emitEvent(ctx.db, ctx.organizationId, "pass.cancelled", { passId: row.pass.id, number: row.pass.number, visits: cancelled.length })
    return { id: row.pass.id, status: "cancelled" as const, cancelledVisits: cancelled.length }
  },
})

export const passesResendConfirmation = defineHandler({
  name: "passes.resendConfirmation",
  method: "POST",
  path: "/passes/{id}/resend-confirmation",
  scope: "write",
  summary: "Send the purchase confirmation again. Needs the messaging layer (Phase 12); not implemented yet.",
  input: idInput,
  output: okOutput,
  async run() {
    throw notImplemented("passes.resendConfirmation")
  },
})

export const passesSendCardUpdateLink = defineHandler({
  name: "passes.sendCardUpdateLink",
  method: "POST",
  path: "/passes/{id}/send-card-update-link",
  scope: "write",
  summary: "Queue an email with a fresh link for the customer to update their card. The link is good for 24 hours; the messaging layer (Phase 12) sends the email.",
  input: idInput,
  output: okOutput,
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    await queueCardUpdateLink(ctx.db, getStripe(), ctx.organizationId, row.pass.id, readAppUrl())
    return OK
  },
})

export const passesStartCardUpdate = defineHandler({
  name: "passes.startCardUpdate",
  method: "POST",
  path: "/passes/{id}/card-update",
  scope: "write",
  customerSelf: true,
  summary: "Open Stripe's hosted page to update the card on a pass and return its address. The link is good for 24 hours. A customer does this only for their own pass.",
  input: idInput,
  output: z.object({ url: z.string().url() }),
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    const [customer] = await ctx.db.select({ stripeCustomerId: s.customer.stripeCustomerId }).from(s.customer).where(eq(s.customer.id, row.pass.customerId))
    if (!customer?.stripeCustomerId) throw new ApiError("unprocessable", "This customer has no card on file to update yet")
    const session = await createCardUpdateSession(getStripe(), { passId: row.pass.id, customerId: customer.stripeCustomerId, origin: readAppUrl() })
    return { url: session.url }
  },
})

export const passesUpdatePreference = defineHandler({
  name: "passes.updatePreference",
  method: "POST",
  path: "/passes/{id}/preference",
  scope: "write",
  customerSelf: true,
  summary: "Change the timing preference of the turn-on or the blowout. A customer may while the visit has no day and its window has not opened.",
  input: z.object({ id: Id, kind: z.enum(["turn-on", "blowout"]), preference: Preference }),
  output: z.object({ id: Id, kind: z.enum(["turn-on", "blowout"]), preference: Preference }),
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    if (!OPEN.includes(row.pass.status as (typeof OPEN)[number])) throw new ApiError("unprocessable", "This pass is no longer open")
    const [visit] = await ctx.db.select().from(s.visit).where(and(eq(s.visit.passId, row.pass.id), eq(s.visit.kind, input.kind)))
    if (!visit) throw new ApiError("unprocessable", `This pass has no ${input.kind} visit`)
    if (!hasScope(ctx.principal, "write")) {
      const [org] = await ctx.db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ctx.organizationId))
      const opens = org?.settings.windows.find((w) => w.kind === input.kind)?.opensOn.slice(0, 10)
      if (visit.scheduledOn || visit.status !== "unscheduled") throw new ApiError("unprocessable", "This visit already has a day; ask us to move it")
      if (opens && today(ctx) >= opens) throw new ApiError("unprocessable", "The window for this visit has opened; ask us to move it")
    }
    await ctx.db.update(s.visit).set({ preference: input.preference }).where(eq(s.visit.id, visit.id))
    await ctx.db
      .update(s.seasonPass)
      .set(input.kind === "turn-on" ? { turnOnPreference: input.preference } : { blowoutPreference: input.preference })
      .where(eq(s.seasonPass.id, row.pass.id))
    const was = input.kind === "turn-on" ? row.pass.turnOnPreference : row.pass.blowoutPreference
    await recordChange(ctx, { customerId: row.pass.customerId, passId: row.pass.id, visitId: visit.id, kind: "preference", detail: { visit: input.kind, from: was, to: input.preference } })
    return { id: row.pass.id, kind: input.kind, preference: input.preference }
  },
})

export const passesAddInspection = defineHandler({
  name: "passes.addInspection",
  method: "POST",
  path: "/passes/{id}/inspection",
  scope: "write",
  customerSelf: true,
  summary: "Add the July inspection to an open pass. A customer may until July 1; an admin while July is open.",
  input: idInput,
  output: z.object({ id: Id, inspection: z.literal(true), visitId: Id, amount: z.number().int() }),
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    if (!OPEN.includes(row.pass.status as (typeof OPEN)[number])) throw new ApiError("unprocessable", "This pass is no longer open")
    if (row.pass.inspection) throw new ApiError("conflict", "This pass already has the inspection")
    const day = today(ctx)
    const season = row.pass.season
    const lastDay = hasScope(ctx.principal, "write") ? `${season}-07-31` : addDays(`${season}-07-01`, -1)
    if (day > lastDay) throw new ApiError("unprocessable", "The inspection can no longer be added to this pass")
    const amount = visitPrice(SEASON_PASS_ADD_ON, row.pass.zones)
    await ctx.db.update(s.seasonPass).set({ inspection: true }).where(eq(s.seasonPass.id, row.pass.id))
    const [visit] = await ctx.db
      .insert(s.visit)
      .values({ organizationId: ctx.organizationId, passId: row.pass.id, customerId: row.pass.customerId, propertyId: row.pass.propertyId, kind: "inspection", window: WINDOW_LABEL.inspection, amount, awaitingPick: row.pass.needsCustomerHome })
      .returning({ id: s.visit.id })
    await recordChange(ctx, { customerId: row.pass.customerId, passId: row.pass.id, visitId: visit!.id, kind: "inspection-added", detail: { amount } })
    return { id: row.pass.id, inspection: true as const, visitId: visit!.id, amount }
  },
})

export const passesSkipVisit = defineHandler({
  name: "passes.skipVisit",
  method: "POST",
  path: "/passes/{id}/skip",
  scope: "write",
  customerSelf: true,
  summary: "Skip a visit that has not happened. It is not charged and its day, if any, is freed.",
  input: z.object({ id: Id, kind: PassVisitKind }),
  output: z.object({ id: Id, visitId: Id, status: z.literal("skipped") }),
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    const [visit] = await ctx.db.select().from(s.visit).where(and(eq(s.visit.passId, row.pass.id), eq(s.visit.kind, input.kind)))
    if (!visit) throw new ApiError("unprocessable", `This pass has no ${input.kind} visit`)
    if (visit.status === "skipped") return { id: row.pass.id, visitId: visit.id, status: "skipped" as const }
    if (!(["unscheduled", "scheduled"] as string[]).includes(visit.status)) throw new ApiError("unprocessable", "This visit can no longer be skipped")
    await ctx.db.update(s.visit).set({ status: "skipped", truckId: null, scheduledOn: null, startTime: null, stopOrder: null }).where(eq(s.visit.id, visit.id))
    await recordChange(ctx, { customerId: row.pass.customerId, passId: row.pass.id, visitId: visit.id, kind: "skipped", detail: { visit: input.kind } })
    return { id: row.pass.id, visitId: visit.id, status: "skipped" as const }
  },
})
