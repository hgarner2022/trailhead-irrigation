/**
 * The pure reducers behind SettingsScreen. Every edit goes through one of
 * them: each returns the new settings and the change log with one more
 * entry (who, when, the field in words, the value before and after as
 * words). An edit that changes nothing returns the state it was given.
 * Also the words for weekdays and visit kinds. The People tab's reducers are
 * in settings-people.ts and the Messages tab's in settings-messages.ts.
 */
import type { AreaGroup, CapacityKind, OrganizationSettings, SeasonWindow, ServiceItem, SettingsChange, Town, Weekday } from "@/lib/admin/types"
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

export const TOWNS: readonly Town[] = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
export const CAPACITY_KINDS: readonly CapacityKind[] = ["turn-on", "inspection", "blowout", "repair", "other"]
export const WINDOW_KINDS: readonly SeasonWindow["kind"][] = ["turn-on", "inspection", "blowout"]

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
export const WINDOW_NAMES: Record<SeasonWindow["kind"], string> = { "turn-on": "Turn-on window", inspection: "Inspection window", blowout: "Blowout window" }

/** The limits the reducers enforce; the number inputs read the same ones. */
export const MAX_CAPACITY = 50
export const MAX_LEAD_WEEKS = 12
export const MAX_FIRM_DAYS = 30

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

const areaOf = (state: SettingsState, id: string) => state.settings.areas.find((a) => a.id === id)
const replaceArea = (s: OrganizationSettings, area: AreaGroup) => ({ ...s, areas: s.areas.map((a) => (a.id === area.id ? area : a)) })

export function setAreaName(state: SettingsState, areaId: string, raw: string, actor: Actor): SettingsState {
  const area = areaOf(state, areaId)
  const name = raw.trim()
  if (!area || !name) return state
  return record(state, actor, `${area.name} name`, area.name, name, replaceArea(state.settings, { ...area, name }))
}

/** The town joins the area, leaving whichever area had it; pressing a town the area already has takes it out, so a town is in at most one area. */
export function toggleAreaTown(state: SettingsState, areaId: string, town: Town, actor: Actor): SettingsState {
  const area = areaOf(state, areaId)
  if (!area) return state
  const had = area.towns.includes(town)
  const areas = state.settings.areas.map((a) => {
    if (a.id === areaId) return { ...a, towns: had ? a.towns.filter((t) => t !== town) : [...a.towns, town] }
    return a.towns.includes(town) ? { ...a, towns: a.towns.filter((t) => t !== town) } : a
  })
  const after = areas.find((a) => a.id === areaId)!
  const from = had ? undefined : state.settings.areas.find((a) => a.id !== areaId && a.towns.includes(town))
  const to = `${after.towns.join(", ") || "None"}${from ? ` (moved from ${from.name})` : ""}`
  return record(state, actor, `${area.name} towns`, area.towns.join(", ") || "None", to, { ...state.settings, areas })
}

/** The town one step up or down the fall or spring order; at an end it stays and nothing is logged. */
export function moveTownInOrder(state: SettingsState, season: "fall" | "spring", town: Town, direction: "up" | "down", actor: Actor): SettingsState {
  const key = season === "fall" ? "fallTownOrder" : "springTownOrder"
  const order = [...state.settings[key]]
  const i = order.indexOf(town)
  const j = direction === "up" ? i - 1 : i + 1
  if (i === -1 || j < 0 || j >= order.length) return state
  ;[order[i], order[j]] = [order[j], order[i]]
  const name = season === "fall" ? "Fall order" : "Spring order"
  return record(state, actor, name, state.settings[key].join(", "), order.join(", "), { ...state.settings, [key]: order })
}

export function setBuffer(state: SettingsState, which: "early" | "late", percent: number, actor: Actor): SettingsState {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) return state
  const key = which === "early" ? "bufferPercentEarly" : "bufferPercentLate"
  const name = which === "early" ? "Buffer, first two weeks" : "Buffer, after the first two weeks"
  return record(state, actor, name, `${state.settings[key]}%`, `${percent}%`, { ...state.settings, [key]: percent })
}

export function setWindow(state: SettingsState, kind: SeasonWindow["kind"], field: "opensOn" | "closesOn" | "leadWeeks", value: string | number, actor: Actor): SettingsState {
  const season = state.settings.windows.find((w) => w.kind === kind)
  if (!season) return state
  if (field === "leadWeeks") {
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > MAX_LEAD_WEEKS) return state
  } else {
    if (!isRealDate(String(value))) return state
    const opens = field === "opensOn" ? String(value) : season.opensOn
    const closes = field === "closesOn" ? String(value) : season.closesOn
    if (opens > closes) return state
  }
  const words = { opensOn: "opens", closesOn: "closes", leadWeeks: "lead weeks" }[field]
  const windows = state.settings.windows.map((w) => (w.kind === kind ? { ...w, [field]: value } : w))
  return record(state, actor, `${WINDOW_NAMES[kind]} ${words}`, String(season[field]), String(value), { ...state.settings, windows })
}

/** A new empty area group at the end of the list. */
export function addArea(state: SettingsState, actor: Actor): SettingsState {
  const n = state.settings.areas.length + 1
  const area: AreaGroup = { id: `area-${n}-${actor.at}`, name: `Area ${n}`, towns: [] }
  return record(state, actor, "Areas", String(n - 1), String(n), { ...state.settings, areas: [...state.settings.areas, area] })
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

