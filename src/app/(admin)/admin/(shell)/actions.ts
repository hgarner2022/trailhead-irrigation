"use server"

import "server-only"
import { redirect } from "next/navigation"
import { callApi } from "@/api/core/call"
import { alertsDismiss } from "@/api/v1/alerts/handlers"
import { apiKeysCreate, apiKeysRevoke } from "@/api/v1/apikeys/handlers"
import { consentsRecord } from "@/api/v1/customers/handlers"
import { passesAddInspection, passesCancel, passesResendConfirmation, passesSendCardUpdateLink, passesSkipVisit, passesUpdatePreference } from "@/api/v1/passes/handlers"
import { scheduleRun } from "@/api/v1/schedule/handlers"
import { servicesUpdate } from "@/api/v1/services/handlers"
import { areasCreate, areasDelete, areasUpdate } from "@/api/v1/areas/handlers"
import { trucksCreate, trucksDeactivate, trucksUpdate } from "@/api/v1/trucks/handlers"
import { visitsGet, visitsMove } from "@/api/v1/visits/handlers"
import { visitsMarkClosed } from "@/api/v1/visits/money"
import { webhooksCreate, webhooksDelete, webhooksTest } from "@/api/v1/webhooks/handlers"
import type { Attention, OrganizationSettings, TimingPreference } from "@/lib/admin/types"
import { requireAdmin } from "@/lib/auth/guard"
import { act, nothing, type ActionOutcome } from "./act"
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

// Schedule ----------------------------------------------------------------------------------------------------------

/** The Schedule button: every pass visit of the window that is due goes onto a truck-day and its customer is told the date. */
export const runSchedule = async (window: "turn-on" | "inspection" | "blowout", season?: number) =>
  act(async (ctx) => {
    const { placed, unplaced } = await callApi(ctx, scheduleRun, { window, ...(season ? { season } : {}) })
    return { placed, unplaced }
  })

/** Place and drag: put a visit on a truck and a day. A refusal comes back in the API's words and the block snaps back. */
export const moveVisit = async (visitId: string, truckId: string, scheduledOn: string) => act((ctx) => nothing(callApi(ctx, visitsMove, { id: visitId, truckId, scheduledOn })))

/** A visit nobody closed in the field, marked done by hand; a pass visit is then charged. */
export const markVisitClosed = async (visitId: string, completedOn?: string) => act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: visitId, ...(completedOn ? { completedOn } : {}) })))

// Settings ----------------------------------------------------------------------------------------------------------

/** Save on the Settings page: the whole screen's settings, written as trucks, areas and sections. */
export const saveSettings = async (settings: OrganizationSettings) => act((ctx) => nothing(writeSettings(ctx, settings)))

type TruckFields = { name: string; jobberUserId?: string; workingDays: string[]; capacityByKind: Record<string, number>; calendarFeedUrl?: string | null }
export const createTruck = async (input: TruckFields) => act((ctx) => nothing(callApi(ctx, trucksCreate, input)))
export const updateTruck = async (id: string, changes: Partial<TruckFields>) => act((ctx) => nothing(callApi(ctx, trucksUpdate, { id, ...changes })))
export const deactivateTruck = async (id: string) => act((ctx) => nothing(callApi(ctx, trucksDeactivate, { id })))

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

// Home --------------------------------------------------------------------------------------------------------------

/**
 * The one button on a Needs action row. A declined card and an expiring card send the card update link and a visit
 * nobody marked done is marked done; every other row is a place to go, so the redirect is the answer: a visit to its
 * panel on Visits, a pass to its panel on Passes.
 */
export async function attentionAction(item: Attention): Promise<ActionOutcome | { ok: true; data: undefined; message: string }> {
  await requireAdmin("manager")
  if ((item.kind === "charge-failed" || item.kind === "card-expiring") && item.passId) {
    const sent = await act((ctx) => callApi(ctx, passesSendCardUpdateLink, { id: item.passId }))
    return sent.ok ? { ok: true, data: undefined, message: "Card update link sent." } : sent
  }
  if (item.kind === "not-closed" && item.visitId) {
    // A one-off visit with a price is also asked how it was paid, so its row opens the panel instead.
    const visit = await act((ctx) => callApi(ctx, visitsGet, { id: item.visitId! }))
    if (visit.ok && !visit.data.passId && visit.data.amount > 0) redirect(`/admin/visits?visit=${encodeURIComponent(item.visitId)}`)
    const done = await act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: item.visitId! })))
    return done.ok ? { ok: true, data: undefined, message: "Marked done." } : done
  }
  if (item.visitId) redirect(`/admin/visits?visit=${encodeURIComponent(item.visitId)}`)
  if (item.passId) redirect(`/admin/passes?pass=${encodeURIComponent(item.passId)}`)
  redirect("/admin/schedule")
}

/** Dismiss on a Needs action row, or with `undo` its Undo. */
export async function dismissAttention(item: Attention, undo = false): Promise<ActionOutcome> {
  if (!item.key) return { ok: false, message: "That row cannot be dismissed." }
  return act((ctx) => nothing(callApi(ctx, alertsDismiss, { kind: item.kind, key: item.key!, ...(undo ? { undo: true } : {}) })))
}
