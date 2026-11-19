"use server"

import "server-only"
import { redirect } from "next/navigation"
import { callApi } from "@/api/core/call"
import { alertsDismiss } from "@/api/v1/alerts/handlers"
import { apiKeysCreate, apiKeysRevoke } from "@/api/v1/apikeys/handlers"
import { consentsRecord } from "@/api/v1/customers/handlers"
import { eventsNote } from "@/api/v1/events/handlers"
import { invoicesRemind } from "@/api/v1/invoices/handlers"
import { propertiesUpdate } from "@/api/v1/properties/handlers"
import { passesAddInspection, passesCancel, passesResendConfirmation, passesSendCardUpdateLink, passesSkipVisit, passesUpdatePreference } from "@/api/v1/passes/handlers"
import { scheduleRun } from "@/api/v1/schedule/handlers"
import { servicesUpdate } from "@/api/v1/services/handlers"
import { areasCreate, areasDelete, areasUpdate } from "@/api/v1/areas/handlers"
import { peopleCreate, peopleDeactivate, peopleUpdate } from "@/api/v1/people/handlers"
import { visitsGet, visitsMove } from "@/api/v1/visits/handlers"
import { visitsMarkClosed } from "@/api/v1/visits/money"
import { webhooksCreate, webhooksDelete, webhooksTest } from "@/api/v1/webhooks/handlers"
import type { YardChanges } from "@/app/(admin)/admin/_screens/visit-actions-types"
import type { Attention, OrganizationSettings, ServiceItem, TimingPreference } from "@/lib/admin/types"
import { requireAdmin } from "@/lib/auth/guard"
import { jobUrl } from "@/lib/admin/links"
import { retryQueueTasks } from "@/lib/admin/queue-retry"
import { timelineOf, type TimelineLine } from "@/lib/events/timeline"
import { act, nothing, type ActionOutcome } from "./act"
import { chargeCard } from "./visit-actions"
import { toApiScopes } from "./key-scopes"
import { saveSettings as writeSettings } from "./settings-save"

// The admin's server actions for passes, the schedule, settings and Home (the visit and customer actions are in
// visit-actions.ts). The shape of every action is in act.ts.

// Passes ------------------------------------------------------------------------------------------------------------

export const resendConfirmation = async (passId: string) => act((ctx) => nothing(callApi(ctx, passesResendConfirmation, { id: passId })))

export const sendCardUpdateLink = async (passId: string) => act((ctx) => nothing(callApi(ctx, passesSendCardUpdateLink, { id: passId })))

export const cancelPass = async (passId: string, reason?: string) => act((ctx) => nothing(callApi(ctx, passesCancel, { id: passId, ...(reason ? { reason } : {}) })))

export const addInspection = async (passId: string) => act((ctx) => nothing(callApi(ctx, passesAddInspection, { id: passId })))

export const changePreference = async (passId: string, kind: "turn-on" | "blowout", preference: TimingPreference) =>
  act((ctx) => nothing(callApi(ctx, passesUpdatePreference, { id: passId, kind, preference })))

export const skipVisit = async (passId: string, kind: "turn-on" | "inspection" | "blowout") => act((ctx) => nothing(callApi(ctx, passesSkipVisit, { id: passId, kind })))

/** The Property block's Save: the yard's nine facts, written on the property through `properties.update`. */
export const updateProperty = async (propertyId: string, changes: YardChanges) => act((ctx) => nothing(callApi(ctx, propertiesUpdate, { id: propertyId, ...changes })))

// Schedule ----------------------------------------------------------------------------------------------------------

/** The Schedule button: every pass visit of the window that is due goes onto someone's day and its customer is told the date. */
export const runSchedule = async (window: "turn-on" | "inspection" | "blowout", season?: number) =>
  act(async (ctx) => {
    const { placed, unplaced } = await callApi(ctx, scheduleRun, { window, ...(season ? { season } : {}) })
    return { placed, unplaced }
  })

/** Place and drag: give a visit to a person on a day. A refusal comes back in the API's words and the block snaps back. */
export const moveVisit = async (visitId: string, personId: string, scheduledOn: string) => act((ctx) => nothing(callApi(ctx, visitsMove, { id: visitId, personId, scheduledOn })))

/** A visit nobody closed in the field, marked done by hand; a pass visit is then charged. */
export const markVisitClosed = async (visitId: string, completedOn?: string) => act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: visitId, ...(completedOn ? { completedOn } : {}) })))

// Settings ----------------------------------------------------------------------------------------------------------

/** Save on the Settings page: the whole screen's settings, written as people, areas and sections. */
export const saveSettings = async (settings: OrganizationSettings, services?: ServiceItem[]) => act((ctx) => nothing(writeSettings(ctx, settings, services)))

/** One person's fields as people.create takes them; on update every one is optional and a text field takes null to clear it. */
type PersonFields = {
  name: string; initials?: string; email?: string; phone?: string; role?: "owner" | "admin" | "tech"; truck?: string; jobberUserId?: string; calendarFeedUrl?: string | null
  workingDays?: string[]; capacityByKind?: Record<string, number>; seasonStart?: string; seasonEnd?: string; hoursStart?: string; hoursEnd?: string
}
type PersonChanges = { [K in keyof PersonFields]?: PersonFields[K] | null }
export const createPerson = async (input: PersonFields) => act((ctx) => nothing(callApi(ctx, peopleCreate, input)))
export const updatePerson = async (id: string, changes: PersonChanges) => act((ctx) => nothing(callApi(ctx, peopleUpdate, { id, ...changes })))
export const deactivatePerson = async (id: string) => act((ctx) => nothing(callApi(ctx, peopleDeactivate, { id })))

type AreaFields = { name: string; towns: string[]; springOrder?: number; fallOrder?: number }
export const createArea = async (input: AreaFields) => act((ctx) => nothing(callApi(ctx, areasCreate, input)))
export const updateArea = async (id: string, changes: Partial<AreaFields>) => act((ctx) => nothing(callApi(ctx, areasUpdate, { id, ...changes })))
export const deleteArea = async (id: string) => act((ctx) => nothing(callApi(ctx, areasDelete, { id })))

export const updateService = async (id: string, changes: Record<string, unknown>) => act((ctx) => nothing(callApi(ctx, servicesUpdate, { id, ...changes })))

// Keys and webhooks -------------------------------------------------------------------------------------------------

/** Makes a key and returns it once. The screen's five scope words fold into the API's `read`, `write` and `admin`. */
export const createApiKey = async (name: string, scopes: string[]) =>
  act(async (ctx) => {
    const made = await callApi(ctx, apiKeysCreate, { name, scopes: toApiScopes(scopes) })
    return { key: made.key }
  })

export const revokeApiKey = async (id: string) => act((ctx) => nothing(callApi(ctx, apiKeysRevoke, { id })))

export const createWebhook = async (url: string, events: string[]) =>
  act(async (ctx) => {
    const made = await callApi(ctx, webhooksCreate, { url, events })
    return { id: made.id, secret: made.secret }
  })
export const deleteWebhook = async (id: string) => act((ctx) => nothing(callApi(ctx, webhooksDelete, { id })))
export const testWebhook = async (id: string) =>
  act(async (ctx) => {
    const { delivered, status, error } = await callApi(ctx, webhooksTest, { id })
    return { delivered, status, error }
  })

// Customers ---------------------------------------------------------------------------------------------------------

/** A customer who asked by phone not to get marketing: appended as the newest consent record, source `admin`. */
export const recordMarketingOptOut = async (customerId: string, note = "Opted out by phone") =>
  act((ctx) => nothing(callApi(ctx, consentsRecord, { id: customerId, marketingOptIn: false, marketingChannels: [], source: "admin", note })))

/**
 * The Notes and history block's Add note: `events.note` as the signed-in person. A tech may add one (the only action here that is
 * not a manager's), and the answer is the note as a line of the story, so the block shows it before the page has refreshed.
 */
export const addNote = async (about: "customer" | "property" | "job" | "visit", aboutId: string, text: string): Promise<ActionOutcome<TimelineLine>> =>
  act(async (ctx) => timelineOf([await callApi(ctx, eventsNote, { about, aboutId, text })], [])[0]!, "tech")

// Home --------------------------------------------------------------------------------------------------------------

/**
 * The one button on a Needs action row. A declined card and an expiring card send the card update link and a visit
 * nobody marked done is marked done, an overdue invoice gets its reminder; every other row is a place to go, so the redirect is the answer: a visit to its
 * panel on Visits, a pass to its job on Jobs.
 */
export async function attentionAction(item: Attention): Promise<ActionOutcome | { ok: true; data: undefined; message: string }> {
  await requireAdmin("manager")
  // A card that failed on a one-off job has no pass to send the link for: the row opens the visit, where the other ways to pay are.
  if ((item.kind === "charge-failed" || item.kind === "card-expiring" || item.kind === "no-card") && item.passId) {
    const sent = await act((ctx) => callApi(ctx, passesSendCardUpdateLink, { id: item.passId }))
    return sent.ok ? { ok: true, data: undefined, message: "Card update link sent." } : sent
  }
  if (item.kind === "jobs-failed" && item.queueIds?.length) {
    const ids = item.queueIds
    const retried = await act(async (ctx) => retryQueueTasks(ctx.db, ctx.organizationId, ids))
    return retried.ok ? { ok: true, data: undefined, message: retried.data === 1 ? "Retrying that task." : `Retrying ${retried.data} tasks.` } : retried
  }
  if (item.kind === "not-closed" && item.visitId) {
    // Mark done writes the done fact and nothing else, so it is the same for every visit: how it is paid is the next step, from the visit's panel or Home's Done, unpaid row.
    const done = await act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: item.visitId! })))
    return done.ok ? { ok: true, data: undefined, message: "Marked done." } : done
  }
  // Card not charged: the row's button is the press. It charges the card on file for what is unpaid on that done visit, once; a decline says so and the customer already has the card link.
  if (item.kind === "charge-not-pressed" && item.visitId) {
    const charged = await chargeCard(item.visitId)
    return charged.ok ? { ok: true, data: undefined, message: "Charged. Receipt emailed." } : charged
  }
  // An overdue invoice: Remind sends the customer one reminder with the pay link (`invoices.remind`, which keys the message by invoice and day, so two presses in a day send one).
  if (item.kind === "overdue" && item.invoiceId) {
    const sent = await act((ctx) => nothing(callApi(ctx, invoicesRemind, { id: item.invoiceId! })))
    return sent.ok ? { ok: true, data: undefined, message: "Reminder sent." } : sent
  }
  // A job that is done and unpaid carries the visit that is unpaid in `visitId`, so it opens on Visits like any visit row, where the panel's Record the payment (or Send an invoice) asks how the money came.
  if (item.visitId) redirect(`/admin/schedule?visit=${encodeURIComponent(item.visitId)}`)
  if (item.passId) redirect(item.jobId ? jobUrl(item.jobId) : "/admin/jobs")
  redirect("/admin/schedule")
}

/** Dismiss on a Needs action row, or with `undo` its Undo. */
export async function dismissAttention(item: Attention, undo = false): Promise<ActionOutcome> {
  if (!item.key) return { ok: false, message: "That row cannot be dismissed." }
  return act((ctx) => nothing(callApi(ctx, alertsDismiss, { kind: item.kind, key: item.key!, ...(undo ? { undo: true } : {}) })))
}
