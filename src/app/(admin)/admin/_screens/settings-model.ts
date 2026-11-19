/**
 * The pure reducers behind SettingsScreen. Every edit goes through one of
 * them: each returns the new settings and the change log with one more
 * entry (who, when, the field in words, the value before and after as
 * words). An edit that changes nothing returns the state it was given.
 * Also the words for weekdays and visit kinds. The People tab's reducers are
 * in settings-people.ts, the Messages tab's in settings-messages.ts and the
 * Billing tab's in settings-billing.ts. The area and capacity-window reducers left
 * with their tabs (step 6): the columns they wrote stay in the database until the
 * engine step reads or drops them.
 */
import type { CapacityKind, OrganizationSettings, ServiceItem, SettingsChange, Weekday } from "@/lib/admin/types"
import { WEEKDAYS } from "@/lib/admin/calendar"

/** One API key as the list shows it; the secret is shown once at creation and never kept. */
export interface ApiKey {
  id: string
  name: string
  /** the first characters of the key, safe to show: "th_live_ab12…" */
  prefix: string
  scopes: ApiScope[]
  /** ISO datetime, or null when never used */
  lastUsedAt: string | null
}

/** The scopes from the IA doc's open API rule. */
export type ApiScope = "read" | "write-passes" | "write-schedule" | "send-messages" | "admin"
export const API_SCOPES: readonly ApiScope[] = ["read", "write-passes", "write-schedule", "send-messages", "admin"]
export const SCOPE_WORDS: Record<ApiScope, string> = {
  read: "Read",
  "write-passes": "Write passes",
  "write-schedule": "Write schedule",
  "send-messages": "Send messages",
  admin: "Admin",
}

/** The prototype's keys: one for an agent that reads, one for the day view. */
export const SAMPLE_KEYS: ApiKey[] = [
  { id: "key-1", name: "Appy agent", prefix: "th_live_ab12…", scopes: ["read", "write-schedule"], lastUsedAt: "2026-11-12T17:05:00Z" },
  { id: "key-2", name: "Day view on the phones", prefix: "th_live_q7mk…", scopes: ["read", "write-passes"], lastUsedAt: "2026-11-10T14:20:00Z" },
  { id: "key-3", name: "Reporting export", prefix: "th_live_x93d…", scopes: ["read"], lastUsedAt: null },
]

export interface SettingsState {
  settings: OrganizationSettings
  changes: SettingsChange[]
  keys: ApiKey[]
  /** the catalogue the Services tab edits, in catalogue order; its rows are saved through services.update */
  services: ServiceItem[]
}

/** Who made the change and when; the screen passes its user and `today`. */
export interface Actor {
  who: string
  at: string
}

export const CAPACITY_KINDS: readonly CapacityKind[] = ["turn-on", "inspection", "blowout", "repair", "other"]

const DAY_WORDS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" }
/** "Mon to Fri" for a run, "Mon, Wed, Fri" otherwise, "None" for no days. */
export function daysWords(days: Weekday[]): string {
  const sorted = WEEKDAYS.filter((d) => days.includes(d))
  if (sorted.length === 0) return "None"
  const first = WEEKDAYS.indexOf(sorted[0])
  const run = sorted.every((d, i) => WEEKDAYS[first + i] === d)
  return run && sorted.length > 2 ? `${DAY_WORDS[sorted[0]]} to ${DAY_WORDS[sorted[sorted.length - 1]]}` : sorted.map((d) => DAY_WORDS[d]).join(", ")
}

export const KIND_PLURALS: Record<CapacityKind, string> = { "turn-on": "turn-ons", inspection: "inspections", blowout: "blowouts", repair: "repairs", other: "other visits" }

/** The limits the reducers enforce; the number inputs read the same ones. */
export const MAX_CAPACITY = 50

/** True for YYYY-MM-DD that is a real calendar day (not Feb 30, not month 13). */
export function isRealDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.toISOString().slice(0, 10) === value
}

const CLIP = 60
/** A value as it is logged: trimmed to sixty characters with an ellipsis. */
export const clip = (s: string) => (s.length > CLIP ? `${s.slice(0, CLIP - 1).trimEnd()}…` : s)

/** One logged change: the settings with the edit made and the log one line longer; the same value twice logs nothing. */
export function record(state: SettingsState, actor: Actor, field: string, from: string, to: string, settings: OrganizationSettings): SettingsState {
  if (from === to) return state
  const change: SettingsChange = { id: `sc${state.changes.length + 1}-${actor.at}`, at: actor.at, who: actor.who, field, from: clip(from), to: clip(to) }
  return { ...state, settings, changes: [...state.changes, change] }
}

/**
 * A one-time secret: the same name and moment give the same key, so the reducer stays pure.
 * TODO(wiring): draw from a secure random source and keep only a hash of the key.
 */
export function secretFor(name: string, at: string): string {
  let h = 2166136261
  for (const ch of `${name}|${at}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  const body = Array.from({ length: 4 }, (_, i) => (Math.imul(h + i * 2654435761, 2246822519) >>> 0).toString(36).padStart(7, "0")).join("")
  return `th_live_${body.slice(0, 28)}`
}

/** The new key joins the list with its prefix; the secret comes back once for the dialog to show and is not stored. A blank name or no scope changes nothing. */
export function createKey(state: SettingsState, name: string, scopes: ApiScope[], actor: Actor): { state: SettingsState; secret: string } | null {
  const trimmed = name.trim()
  if (!trimmed || scopes.length === 0) return null
  const secret = secretFor(trimmed, actor.at)
  const key: ApiKey = { id: `key-${state.keys.length + 1}-${actor.at}`, name: trimmed, prefix: `${secret.slice(0, 12)}…`, scopes: API_SCOPES.filter((s) => scopes.includes(s)), lastUsedAt: null }
  const next = record({ ...state, keys: [...state.keys, key] }, actor, "API keys", String(state.keys.length), `${state.keys.length + 1} (${trimmed} created)`, state.settings)
  return { state: next, secret }
}

export function revokeKey(state: SettingsState, keyId: string, actor: Actor): SettingsState {
  const key = state.keys.find((k) => k.id === keyId)
  if (!key) return state
  const keys = state.keys.filter((k) => k.id !== keyId)
  return record({ ...state, keys }, actor, "API keys", `${state.keys.length} (${key.name} included)`, `${keys.length} (${key.name} revoked)`, state.settings)
}

/** The service fields the Services tab edits. */
export type ServiceField = "name" | "description" | "price" | "includedZones" | "extraZonePrice" | "slotMinutes" | "taxable" | "active"
const SERVICE_WORDS: Record<ServiceField, string> = {
  name: "name", description: "what's included", price: "price", includedZones: "included zones", extraZonePrice: "per extra zone", slotMinutes: "minutes", taxable: "taxable", active: "active",
}
/** A service with a per-zone rule carries a price for each zone past the included ones; one without has no zone cells. */
export const hasZoneRule = (s: ServiceItem) => s.extraZonePrice !== undefined
/** A quote-only service with no price stays without one. */
export const priceIsFixed = (s: ServiceItem) => !(s.quoteOnly && s.price === undefined)

/** The limits services.update enforces, so a value it would refuse snaps back instead of failing at Save. */
const wholeIn = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max

/**
 * One edit to a catalogue service, found by key. A blank description clears it; a description with a dollar sign
 * (prices live on the service) and any number outside the API's range is refused as it would be at Save. The zone
 * fields change only on a service with a per-zone rule, the price only when the service has one to change.
 */
export function setServiceField(state: SettingsState, key: string, field: ServiceField, raw: string | number | boolean, actor: Actor): SettingsState {
  const service = state.services.find((s) => s.key === key)
  if (!service) return state
  const next: ServiceItem = { ...service }
  const show = (s: ServiceItem): string => {
    const v = field === "active" ? (s.active ?? true) : field === "taxable" ? (s.taxable ?? false) : s[field]
    if (v === undefined || v === null || v === "") return "None"
    if (typeof v === "boolean") return v ? "Yes" : "No"
    return field === "price" || field === "extraZonePrice" ? `$${v}` : String(v)
  }
  if (field === "name" || field === "description") {
    const text = String(raw).trim()
    if (field === "name") {
      if (!text || text.length > 120) return state
      next.name = text
    } else {
      if (text.length > 1000 || text.includes("$")) return state
      next.description = text || null
    }
  } else if (field === "taxable" || field === "active") {
    if (typeof raw !== "boolean") return state
    next[field] = raw
  } else {
    const n = typeof raw === "string" ? (raw.trim() === "" ? NaN : Number(raw)) : raw
    if (field === "price" ? !priceIsFixed(service) || !wholeIn(n, 0, 100_000) : false) return state
    if (field === "slotMinutes" ? !wholeIn(n, 15, 480) || n % 15 !== 0 : false) return state
    if (field === "includedZones" ? !hasZoneRule(service) || !wholeIn(n, 1, 16) : false) return state
    if (field === "extraZonePrice" ? !hasZoneRule(service) || !wholeIn(n, 0, 1000) : false) return state
    next[field] = n as number
  }
  if (show(service) === show(next)) return state
  const services = state.services.map((s) => (s.key === key ? next : s))
  return record({ ...state, services }, actor, `${service.name} ${SERVICE_WORDS[field]}`, show(service), show(next), state.settings)
}

