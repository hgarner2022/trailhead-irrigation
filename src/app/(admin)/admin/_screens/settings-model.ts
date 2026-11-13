/**
 * The pure reducers behind SettingsScreen. Every edit goes through one of
 * them: each returns the new settings and the change log with one more
 * entry (who, when, the field in words, the value before and after as
 * words). An edit that changes nothing returns the state it was given.
 * Also the words for weekdays and visit kinds, and the preview that fills a
 * message template.
 */
import type { AdminData, AreaGroup, CapacityKind, MessageTemplate, OrganizationSettings, SeasonWindow, SettingsChange, Town, Truck, Weekday } from "@/lib/admin/types"
import { WEEKDAYS } from "@/lib/admin/calendar"
import { KIND_WORDS, TIME_ZONE, writtenDate } from "@/lib/admin/format"

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
/** "Purchase confirmation" from "purchase-confirmation". */
export const messageName = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ")
export const channelWord = (channel: MessageTemplate["channel"]) => (channel === "sms" ? "Text" : "Email")

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

function record(state: SettingsState, actor: Actor, field: string, from: string, to: string, settings: OrganizationSettings): SettingsState {
  if (from === to) return state
  const change: SettingsChange = { id: `sc${state.changes.length + 1}-${actor.at}`, at: actor.at, who: actor.who, field, from: clip(from), to: clip(to) }
  return { ...state, settings, changes: [...state.changes, change] }
}

const replaceTruck = (s: OrganizationSettings, truck: Truck) => ({ ...s, trucks: s.trucks.map((t) => (t.id === truck.id ? truck : t)) })
const truckOf = (state: SettingsState, id: string) => state.settings.trucks.find((t) => t.id === id)

export function setTruckName(state: SettingsState, truckId: string, raw: string, actor: Actor): SettingsState {
  const truck = truckOf(state, truckId)
  const name = raw.trim()
  if (!truck || !name) return state
  return record(state, actor, `${truck.name} name`, truck.name, name, replaceTruck(state.settings, { ...truck, name }))
}

export function toggleWorkingDay(state: SettingsState, truckId: string, day: Weekday, actor: Actor): SettingsState {
  const truck = truckOf(state, truckId)
  if (!truck) return state
  const workingDays = WEEKDAYS.filter((d) => (d === day ? !truck.workingDays.includes(d) : truck.workingDays.includes(d)))
  return record(state, actor, `${truck.name} working days`, daysWords(truck.workingDays), daysWords(workingDays), replaceTruck(state.settings, { ...truck, workingDays }))
}

export function setCapacity(state: SettingsState, truckId: string, kind: CapacityKind, n: number, actor: Actor): SettingsState {
  const truck = truckOf(state, truckId)
  if (!truck || !Number.isInteger(n) || n < 0 || n > MAX_CAPACITY) return state
  const capacityByKind = { ...truck.capacityByKind, [kind]: n }
  return record(state, actor, `${truck.name} ${KIND_PLURALS[kind]} per day`, String(truck.capacityByKind[kind]), String(n), replaceTruck(state.settings, { ...truck, capacityByKind }))
}

export function setJobberUser(state: SettingsState, truckId: string, jobberUserId: string, actor: Actor): SettingsState {
  const truck = truckOf(state, truckId)
  if (!truck) return state
  return record(state, actor, `${truck.name} Jobber user`, truck.jobberUserId || "None", jobberUserId || "None", replaceTruck(state.settings, { ...truck, jobberUserId }))
}

/** The truck leaves the list; its visits are not touched here, the next schedule run no longer plans onto it. */
export function removeTruck(state: SettingsState, truckId: string, actor: Actor): SettingsState {
  const truck = truckOf(state, truckId)
  if (!truck) return state
  const trucks = state.settings.trucks.filter((t) => t.id !== truckId)
  return record(state, actor, "Trucks", `${state.settings.trucks.length} (${truck.name} included)`, `${trucks.length} (${truck.name} removed)`, { ...state.settings, trucks })
}

/** A new truck, named after its position, working Monday to Friday with nothing planned per day yet. */
export function addTruck(state: SettingsState, actor: Actor): SettingsState {
  const n = state.settings.trucks.length + 1
  const truck: Truck = {
    id: `truck-${n}-${actor.at}`,
    name: `Truck ${n}`,
    workingDays: ["mon", "tue", "wed", "thu", "fri"],
    capacityByKind: { "turn-on": 0, inspection: 0, blowout: 0, repair: 0, other: 0 },
  }
  return record(state, actor, "Trucks", String(n - 1), String(n), { ...state.settings, trucks: [...state.settings.trucks, truck] })
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

export function setMessage(state: SettingsState, key: string, field: "subject" | "body" | "enabled", value: string | boolean, actor: Actor): SettingsState {
  const message = state.settings.messages.find((m) => m.key === key)
  if (!message) return state
  const messages = state.settings.messages.map((m) => (m.key === key ? { ...m, [field]: value } : m))
  const words = (v: string | boolean | undefined) => (typeof v === "boolean" ? (v ? "On" : "Off") : (v ?? ""))
  const name = field === "enabled" ? `${messageName(key)} (${channelWord(message.channel).toLowerCase()})` : `${messageName(key)} ${field}`
  return record(state, actor, name, words(message[field]), words(value), { ...state.settings, messages })
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

/** What the preview fills the template's placeholders with. */
export interface Sample {
  firstName: string
  visit: string
  date: string
  truck: string
  nextVisit: string
}

/** The template with every {placeholder} filled from the sample; an unknown placeholder stays as written. */
export function fillMessage(body: string, sample: Sample): string {
  return body.replace(/\{(\w+)\}/g, (match, key: string) => (key in sample ? sample[key as keyof Sample] : match))
}

/** The preview's sample: the first pass's first name, the first scheduled visit with a truck, and the pass's next visit; plain stand-ins when the data is empty. */
export function sampleFor(data: AdminData): Sample {
  const pass = data.passes[0]
  const visit = data.visits.find((v) => v.startAt && v.truckId)
  const truck = visit ? data.settings.trucks.find((t) => t.id === visit.truckId) : undefined
  return {
    firstName: pass?.firstName ?? "Alex",
    visit: visit ? KIND_WORDS[visit.kind] : "visit",
    date: visit?.startAt ? writtenDate(visit.startAt, TIME_ZONE) : "a day we will confirm",
    truck: truck?.name ?? "Truck 1",
    nextVisit: pass?.visits[1] ? KIND_WORDS[pass.visits[1].kind] : "next visit",
  }
}
