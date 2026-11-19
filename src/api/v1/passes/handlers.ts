import "server-only"
import { and, desc, eq, exists, gte, isNotNull, isNull, lt, notInArray, sql } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { windowAt } from "@/lib/services-window"
import { recordEvent, whoOf } from "@/lib/events/record"
import { visitName } from "@/lib/events/names"
import { enqueueGeocode } from "@/lib/geocode"
import { linesForPassVisits } from "@/lib/jobs/lines"
import { cancelVisitLines, deleteJobVisitLines, insertLines } from "@/lib/jobs/write-lines"
import { assertBeforeCutoff } from "../portal/cutoff"
import { currentSeason } from "@/lib/pass/season"
import { SEASON_PASS_ADD_ON, visitPrice, visitsOnSale } from "@/lib/season-pass"
import { hasScope } from "@/lib/auth/principal"
import { readAppUrl } from "@/lib/env"
import { activatePass } from "@/lib/pass/server/activate"
import { holdChosenDays } from "@/lib/pass/server/chosen-days"
import { emailDomainReachable, failedCheckoutStep, MAX_PENDING_PER_HOUR, newestPendingPass, pendingPassesLastHour } from "@/lib/pass/server/create"
import { cleanEmail, cleanName, cleanText, normalizePhone } from "@/lib/format/contact"
import { queuePurchaseConfirmation } from "@/lib/pass/server/purchase"
import { insertPassVisits, makePassRows, WINDOW_LABEL } from "@/lib/pass/server/rows"
import { loadPassRecord, type PassRecord } from "@/lib/pass/server/record"
import { CONSENT_SNAPSHOT, consentSnapshot } from "@/lib/pass/server/consent-snapshot"
import { outOfAreaMessage } from "@/lib/places"
import { queueCardUpdateLink } from "@/lib/pass/server/card-link"
import { queueCancelledEmail } from "@/lib/pass/server/cancel"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { ensureStripeCustomer } from "@/lib/stripe/customer"
import { enqueue } from "@/lib/queue"
import { emitEvent } from "../webhooks/deliver"
import { getStripe } from "@/lib/stripe/client"
import type { Ctx } from "../../core/context"
import { randomUUID } from "node:crypto"
import { ApiError, notImplemented } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { addDays, Id, idInput, OK, okOutput, PassStatus, Preference, Town, today } from "../shared"
import { finishPurchase } from "./finish"
import { renewPass } from "./renew"
import { chosenDay, PassDetail, PassOut, passActivateInput, passConsentInput, passCreateInput } from "./schemas"
import { loadPass, passDetail, passesQuery, passOut, passScope, recordChange, withPassFacts } from "./queries"

const PassVisitKind = z.enum(["turn-on", "inspection", "blowout"])
const OPEN = ["pending", "active"] as const

/** The status filter against the job and the season, the same rules as `passStatus`: cancelled is the job's `cancelled_at`, pending is a job not sold yet, lapsed is a season whose year is over, active is the rest. */
function statusFilter(status: z.infer<typeof PassStatus>, day: string) {
  const year = Number(day.slice(0, 4))
  const live = and(isNull(s.job.cancelledAt), isNotNull(s.job.soldOn))
  if (status === "cancelled") return isNotNull(s.job.cancelledAt)
  if (status === "pending") return and(isNull(s.job.soldOn), isNull(s.job.cancelledAt))
  if (status === "lapsed") return and(live, lt(s.job.season, year))
  return and(live, gte(s.job.season, year))
}

/** A pass has the preference when its turn-on or blowout visit asks for it (a visit with none asks for the recommended day). */
function preferenceFilter(preference: z.infer<typeof Preference>) {
  return exists(
    sql`(select 1 from ${s.visit} where ${s.visit.jobId} = ${s.job.id} and ${s.visit.kind} in ('turn-on', 'blowout') and ${s.visit.status} <> 'cancelled' and coalesce(${s.visit.preference}, 'recommended') = ${preference})`,
  )
}

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
          passScope(ctx),
          hasScope(ctx.principal, "read") ? undefined : eq(s.job.customerId, ownCustomerId(ctx)),
          input.season ? eq(s.job.season, input.season) : undefined,
          input.status ? statusFilter(input.status, today(ctx)) : undefined,
          input.town ? eq(s.property.town, input.town) : undefined,
          input.preference ? preferenceFilter(input.preference) : undefined,
          afterTimeCursor(s.job.createdAt, s.job.id, input.cursor),
        ),
      )
      .orderBy(desc(s.job.createdAt), desc(s.job.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, (r) => timeCursor(r.pass))
    return { data: (await withPassFacts(ctx, result.data)).map((r) => passOut(ctx, r)), next_cursor: result.next_cursor }
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
  summary: "Create the checkout's pending pass: the customer, the property and one visit for each visit still on sale this season. Given the `passId` of a pending pass for the same email it updates that pass instead. Given `renewOf` (the customer's last pass, with the write scope or a checked renewal link) it makes the next season's pass active on the card already on file, schedules the days picked and queues the confirmation; there is no card step. The anonymous checkout is also held to the checkout's own step rules, an email whose domain has a mail server and three new passes per email per hour.",
  input: passCreateInput,
  output: PassDetail,
  async run(ctx, input) {
    if (input.renewOf) return renewPass(ctx, input)
    const day = today(ctx)
    const onSale = visitsOnSale(input.inspection, day)
    if (onSale.length === 0) throw new ApiError("unprocessable", "No visits are on sale this season any more")
    const season = currentSeason(day)
    const org = ctx.organizationId
    const email = cleanEmail(input.customer.email)
    // Stored the way they print: "hannah garner" as Hannah Garner, the phone in one standard form, notes without stray spaces.
    const contact = {
      firstName: cleanName(input.customer.firstName),
      lastName: input.customer.lastName?.trim() ? cleanName(input.customer.lastName) : null,
      email,
      phone: normalizePhone(input.customer.phone) ?? input.customer.phone ?? null,
    }
    const accessNote = input.accessNote ? cleanText(input.accessNote) : null
    const visitor = ctx.principal.kind === "public"
    if (visitor) {
      const step = failedCheckoutStep({ property: input.property, zones: input.zones, needsCustomerHome: input.needsCustomerHome ?? false, customer: { ...input.customer, email }, today: day })
      if (step === "address") throw new ApiError("unprocessable", outOfAreaMessage({ ok: false, place: input.property.town }), [{ path: "reason", message: "out-of-area" }])
      if (step) throw new ApiError("invalid", `The ${step} step is not complete`, [{ path: "reason", message: step }])
      if (!(await emailDomainReachable(email))) throw new ApiError("unprocessable", "We can't find that email's mail server. Check the spelling.", [{ path: "reason", message: "email-unreachable" }])
    }
    const [known] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.organizationId, org), sql`lower(${s.customer.email}) = ${email}`)).limit(1)
    // The pass id the checkout holds may be the job's id or the old pass id a browser stored before the move.
    const held = input.passId ? await loadPassRecord(ctx.db, input.passId, org) : null
    // A customer who reloads or comes back later picks up their own pending pass (the newest one this hour) rather than
    // starting another: there is no cart to lose, and the hourly limit is then only ever reached by something odd.
    const [resumed] = visitor && known && !held ? await newestPendingPass(ctx.db, org, known.id, ctx.now) : []
    const candidate = held ?? resumed
    // A pending pass (not sold, not canceled) of an earlier season is not picked up again: the new season gets its own pass.
    const reused = candidate && !candidate.soldOn && !candidate.cancelledAt && known && candidate.customerId === known.id && candidate.season === season ? candidate : undefined
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
    // The yard answers the customer just gave (zones, must be home, the access note) go on the property; a known property takes them as the newer word.
    // A known property takes the zones as the newer word, but an answer the checkout did not give never clears what the office or the customer already holds.
    const yard = { zones: input.zones, mustBeHome: input.needsCustomerHome ?? false, accessNote }
    const knownYard = {
      zones: input.zones,
      ...(typeof input.needsCustomerHome === "boolean" ? { mustBeHome: input.needsCustomerHome } : {}),
      ...(accessNote ? { accessNote } : {}),
    }
    const property = knownProperty
      ? (await ctx.db.update(s.property).set({ ...knownYard, updatedAt: ctx.now }).where(eq(s.property.id, knownProperty.id)).returning())[0]!
      : (await ctx.db.insert(s.property).values({ organizationId: org, customerId: customerRow.id, address: address.address, town: address.town, ...yard }).returning())[0]!
    if (!knownProperty) await enqueueGeocode(ctx.db, org, property.id, ctx.now)
    const [terms] = await ctx.db.select({ v: s.organization.termsVersion }).from(s.organization).where(eq(s.organization.id, org))

    // The yard answers (zones, must be home, the access note) are already on the property; the inspection add-on and the timing
    // preferences are the lines and visits built below.
    let pass: PassRecord
    if (reused) {
      // A customer who went back changes the answers on the pass they hold; its visits are rebuilt, none has a day yet.
      await ctx.db.update(s.job).set({ season, propertyId: property.id, updatedAt: ctx.now }).where(eq(s.job.id, reused.jobId))
      // Only the checkout that holds the pass id (the same browser going back) may change the customer's name and phone.
      // A resume by email alone reuses the pass but never rewrites who the customer is: anyone can type an email.
      if (held) await ctx.db.update(s.customer).set({ firstName: contact.firstName, lastName: contact.lastName ?? customerRow.lastName, phone: contact.phone ?? customerRow.phone, updatedAt: ctx.now }).where(eq(s.customer.id, customerRow.id))
      // Filling a last name nobody has recorded yet is not rewriting who the customer is, so a resume by email may do it.
      else if (!customerRow.lastName && contact.lastName) await ctx.db.update(s.customer).set({ lastName: contact.lastName, updatedAt: ctx.now }).where(eq(s.customer.id, customerRow.id))
      await deleteJobVisitLines(ctx.db, [reused.jobId])
      await ctx.db.delete(s.visit).where(eq(s.visit.jobId, reused.jobId))
      pass = { ...reused, propertyId: property.id, zones: input.zones, season }
      await insertPassVisits(ctx.db, { ...pass, turnOnPreference: input.turnOnPreference, blowoutPreference: input.blowoutPreference }, onSale, ctx.now)
    } else {
      pass = await makePassRows(ctx.db, { organizationId: org, customerId: customerRow.id, propertyId: property.id, season, onSale, zones: input.zones, inspection: input.inspection, turnOnPreference: input.turnOnPreference, blowoutPreference: input.blowoutPreference, status: "pending", source: "checkout", now: ctx.now })
    }
    if (input.consent) {
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
      await recordEvent(ctx.db, { organizationId: org, about: "job", aboutId: pass.jobId, customerId: customerRow.id, jobId: pass.jobId, kind: "consent", detail: { marketingOptIn: input.consent.marketingOptIn, marketingChannels: input.consent.marketingChannels, source: input.consent.source }, who: whoOf(ctx), at: ctx.now })
    }
    await holdChosenDays(ctx.db, pass.jobId, input.days.map(chosenDay), input.property.town, season, day)
    return passDetail(ctx, await loadPass(ctx, pass.id))
  },
})

export const passesActivate = defineHandler({
  name: "passes.activate",
  method: "POST",
  path: "/passes/{id}/activate",
  scope: "write",
  checkout: "own-pass",
  summary: "Activate a pending pass once its card is saved: stores the card from the finished setup session, makes the pass active, schedules the days the customer picked (a day that filled up since goes on the next open day), records the checkout's consent and queues the onboarding task and the purchase confirmation. Safe to call twice for one session.",
  input: passActivateInput,
  output: PassDetail,
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    await activatePass(ctx.db, getStripe(), row.pass.id, input.setupSessionId, ctx.now, whoOf(ctx), ctx.organizationId)
    // The boxes in the request win; without them (the webhook activated first) the snapshot from when the card form opened stands in.
    const consent = input.consent ?? (await consentSnapshot(ctx.db, row.pass.id))
    await finishPurchase(ctx, row.pass, row.town, consent)
    return passDetail(ctx, await loadPass(ctx, input.id))
  },
})

export const passesConsent = defineHandler({
  name: "passes.consent",
  method: "POST",
  path: "/passes/{id}/consent",
  scope: "write",
  checkout: "own-pass",
  summary: "Record the boxes ticked on the card step, on the pending pass, when the card form opens. Nothing is stored as consent yet; `passes.activate` records it when the card is saved, from its own request or, when Stripe's webhook gets there first because the tab was closed, from this snapshot.",
  input: passConsentInput,
  output: okOutput,
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    if (row.facts.status !== "pending") return OK
    await recordChange(ctx, { customerId: row.pass.customerId, jobId: row.pass.id, kind: CONSENT_SNAPSHOT, detail: { ...input.consent, stage: "chosen" } })
    return OK
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
    if (row.facts.status === "cancelled") return { id: row.pass.id, status: "cancelled" as const, cancelledVisits: 0 }
    // The pass is canceled when its job says so: `cancelled_at` is the whole fact.
    await ctx.db.update(s.job).set({ cancelledAt: ctx.now, updatedAt: ctx.now }).where(eq(s.job.id, row.pass.id))
    const cancelled = await ctx.db
      .update(s.visit)
      .set({ status: "cancelled", personId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false })
      .where(and(eq(s.visit.jobId, row.pass.id), notInArray(s.visit.status, ["completed", "cancelled"])))
      .returning({ id: s.visit.id })
    await cancelVisitLines(ctx.db, cancelled.map((v) => v.id), ctx.now)
    await recordChange(ctx, { customerId: row.pass.customerId, jobId: row.pass.id, kind: "cancelled", detail: { reason: input.reason ?? null, visits: cancelled.length, passNumber: row.job.passNumber ?? "" } })
    await enqueue(ctx.db, ctx.organizationId, "pass-cancel", row.pass.id, { passId: row.pass.id })
    await queueCancelledEmail(ctx.db, row.pass.id, readAppUrl(), ctx.organizationId)
    await emitEvent(ctx.db, ctx.organizationId, "pass.cancelled", { passId: row.pass.id, number: row.job.passNumber ?? "", visits: cancelled.length })
    return { id: row.pass.id, status: "cancelled" as const, cancelledVisits: cancelled.length }
  },
})

export const passesResendConfirmation = defineHandler({
  name: "passes.resendConfirmation",
  method: "POST",
  path: "/passes/{id}/resend-confirmation",
  scope: "write",
  summary: "Send the purchase confirmation again, through the same consent gate (a customer without an email address gets none). Each call is its own message.",
  input: idInput,
  output: okOutput,
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    if (row.facts.status === "pending") throw new ApiError("unprocessable", "This pass has not been bought yet")
    if (!(await queuePurchaseConfirmation(ctx.db, row.pass.id, readAppUrl(), `resend-${randomUUID()}`, { organizationId: ctx.organizationId }))) throw new ApiError("unprocessable", "This customer has no email address to send it to")
    return OK
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
  summary: "Open Stripe's hosted page to update the card on a pass, or to add one to a pass sold with none, and return its address. The link is good for 24 hours. A customer does this only for their own pass.",
  input: idInput,
  output: z.object({ url: z.string().url() }),
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    if (row.facts.status === "pending") throw new ApiError("unprocessable", "This pass has not been bought yet")
    const stripe = getStripe()
    const session = await createCardUpdateSession(stripe, { passId: row.pass.id, customerId: await ensureStripeCustomer(ctx.db, stripe, row.pass.customerId, ctx.now), origin: readAppUrl() })
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
    if (!OPEN.includes(row.facts.status as (typeof OPEN)[number])) throw new ApiError("unprocessable", "This pass is no longer open")
    const [visit] = await ctx.db.select().from(s.visit).where(and(eq(s.visit.jobId, row.pass.id), eq(s.visit.kind, input.kind)))
    if (!visit) throw new ApiError("unprocessable", `This pass has no ${input.kind} visit`)
    if (!hasScope(ctx.principal, "write")) {
      const [org] = await ctx.db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ctx.organizationId))
      const saved = org?.settings.windows.find((w) => w.kind === input.kind)
      const opens = saved ? windowAt(saved, today(ctx)).opensOn : undefined
      if (visit.scheduledOn || visit.status !== "unscheduled") throw new ApiError("unprocessable", "This visit already has a day; ask us to move it")
      if (opens && today(ctx) >= opens) throw new ApiError("unprocessable", "The window for this visit has opened; ask us to move it")
    }
    await ctx.db.update(s.visit).set({ preference: input.preference }).where(eq(s.visit.id, visit.id))
    const was = input.kind === "turn-on" ? row.facts.turnOnPreference : row.facts.blowoutPreference
    await recordChange(ctx, { customerId: row.pass.customerId, jobId: row.pass.id, visitId: visit.id, kind: "preference", detail: { visit: input.kind, from: was, to: input.preference } })
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
    if (!OPEN.includes(row.facts.status as (typeof OPEN)[number])) throw new ApiError("unprocessable", "This pass is no longer open")
    if (row.facts.inspection) throw new ApiError("conflict", "This pass already has the inspection")
    const day = today(ctx)
    const season = row.job.season ?? 0
    const lastDay = hasScope(ctx.principal, "write") ? `${season}-07-31` : addDays(`${season}-07-01`, -1)
    if (day > lastDay) throw new ApiError("unprocessable", "The inspection can no longer be added to this pass")
    const zones = row.yard.zones ?? 0
    const amount = visitPrice(SEASON_PASS_ADD_ON, zones)
    const [visit] = await ctx.db
      .insert(s.visit)
      .values({ organizationId: ctx.organizationId, jobId: row.pass.id, customerId: row.pass.customerId, propertyId: row.pass.propertyId, kind: "inspection", window: WINDOW_LABEL.inspection })
      .returning({ id: s.visit.id })
    const lines = linesForPassVisits([SEASON_PASS_ADD_ON], zones).map((line) => ({ ...line, visitId: visit!.id }))
    await insertLines(ctx.db, { organizationId: ctx.organizationId, jobId: row.pass.id, now: ctx.now, untaxed: true }, lines)
    await recordChange(ctx, { customerId: row.pass.customerId, jobId: row.pass.id, visitId: visit!.id, kind: "inspection-added", detail: { amount } })
    return { id: row.pass.id, inspection: true as const, visitId: visit!.id, amount }
  },
})

export const passesSkipVisit = defineHandler({
  name: "passes.skipVisit",
  method: "POST",
  path: "/passes/{id}/skip",
  scope: "write",
  customerSelf: true,
  summary: "Skip a visit that has not happened. It is not charged and its day, if any, is freed. A customer may skip only until 24 hours before its day; the office may skip any time.",
  input: z.object({ id: Id, kind: PassVisitKind }),
  output: z.object({ id: Id, visitId: Id, status: z.literal("skipped") }),
  async run(ctx, input) {
    const row = await loadPass(ctx, input.id)
    const [visit] = await ctx.db.select().from(s.visit).where(and(eq(s.visit.jobId, row.pass.id), eq(s.visit.kind, input.kind)))
    if (!visit) throw new ApiError("unprocessable", `This pass has no ${input.kind} visit`)
    if (visit.status === "skipped") return { id: row.pass.id, visitId: visit.id, status: "skipped" as const }
    if (!(["unscheduled", "scheduled"] as string[]).includes(visit.status)) throw new ApiError("unprocessable", "This visit can no longer be skipped")
    assertBeforeCutoff(ctx, visit)
    await ctx.db.update(s.visit).set({ status: "skipped", personId: null, scheduledOn: null, startTime: null, stopOrder: null }).where(eq(s.visit.id, visit.id))
    await cancelVisitLines(ctx.db, [visit.id], ctx.now)
    await recordChange(ctx, { customerId: row.pass.customerId, jobId: row.pass.id, visitId: visit.id, kind: "skipped", detail: { name: visitName(visit.kind), visit: input.kind } })
    return { id: row.pass.id, visitId: visit.id, status: "skipped" as const }
  },
})
