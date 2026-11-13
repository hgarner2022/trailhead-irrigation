/**
 * The pure reducers behind SettingsScreen. Every edit goes through one of
 * them: each returns the new settings and the change log with one more
 * entry (who, when, the field in words, the value before and after as
 * words). An edit that changes nothing returns the state it was given.
 * Also the words for weekdays and visit kinds, and the preview that fills a
 * message template.
 */
import type { AreaGroup, CapacityKind, MessageTemplate, OrganizationSettings, SeasonWindow, SettingsChange, Town, Truck, Weekday } from "@/lib/admin/types"
import { WEEKDAYS } from "@/components/blocks/week-grid-days"

export interface SettingsState {
  settings: OrganizationSettings
  changes: SettingsChange[]
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

const CLIP = 60
/** A value as it is logged: trimmed to sixty characters with an ellipsis. */
export const clip = (s: string) => (s.length > CLIP ? `${s.slice(0, CLIP - 1).trimEnd()}…` : s)

function record(state: SettingsState, actor: Actor, field: string, from: string, to: string, settings: OrganizationSettings): SettingsState {
  if (from === to) return state
  const change: SettingsChange = { id: `sc${state.changes.length + 1}-${actor.at}`, at: actor.at, who: actor.who, field, from: clip(from), to: clip(to) }
  return { settings, changes: [...state.changes, change] }
}

const replaceTruck = (s: OrganizationSettings, truck: Truck) => ({ ...s, trucks: s.trucks.map((t) => (t.id === truck.id ? truck : t)) })
const truckOf = (state: SettingsState, id: string) => state.settings.trucks.find((t) => t.id === id)

export function setTruckName(state: SettingsState, truckId: string, name: string, actor: Actor): SettingsState {
  const truck = truckOf(state, truckId)
  if (!truck) return state
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
  if (!truck || !Number.isInteger(n) || n < 0) return state
  const capacityByKind = { ...truck.capacityByKind, [kind]: n }
  return record(state, actor, `${truck.name} ${KIND_PLURALS[kind]} per day`, String(truck.capacityByKind[kind]), String(n), replaceTruck(state.settings, { ...truck, capacityByKind }))
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

export function setAreaName(state: SettingsState, areaId: string, name: string, actor: Actor): SettingsState {
  const area = areaOf(state, areaId)
  if (!area) return state
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
  return record(state, actor, `${area.name} towns`, area.towns.join(", ") || "None", after.towns.join(", ") || "None", { ...state.settings, areas })
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
  const window = state.settings.windows.find((w) => w.kind === kind)
  if (!window) return state
  if (field === "leadWeeks" && (!Number.isInteger(value) || Number(value) < 0)) return state
  if (field !== "leadWeeks" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return state
  const words = { opensOn: "opens", closesOn: "closes", leadWeeks: "lead weeks" }[field]
  const windows = state.settings.windows.map((w) => (w.kind === kind ? { ...w, [field]: value } : w))
  return record(state, actor, `${WINDOW_NAMES[kind]} ${words}`, String(window[field]), String(value), { ...state.settings, windows })
}

export function setFirmDays(state: SettingsState, days: number, actor: Actor): SettingsState {
  if (!Number.isInteger(days) || days < 0) return state
  return record(state, actor, "Firm days ahead", String(state.settings.firmDaysAhead), String(days), { ...state.settings, firmDaysAhead: days })
}

export function setMessage(state: SettingsState, key: string, field: "subject" | "body" | "enabled", value: string | boolean, actor: Actor): SettingsState {
  const message = state.settings.messages.find((m) => m.key === key)
  if (!message) return state
  const messages = state.settings.messages.map((m) => (m.key === key ? { ...m, [field]: value } : m))
  const words = (v: string | boolean | undefined) => (typeof v === "boolean" ? (v ? "On" : "Off") : (v ?? ""))
  const name = field === "enabled" ? `${messageName(key)} (${channelWord(message.channel).toLowerCase()})` : `${messageName(key)} ${field}`
  return record(state, actor, name, words(message[field]), words(value), { ...state.settings, messages })
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
