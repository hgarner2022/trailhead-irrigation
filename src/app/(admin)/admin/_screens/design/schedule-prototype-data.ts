import { TOWN_CENTRES } from "@/components/blocks/day-map-helpers"
import { addDays } from "@/lib/admin/calendar"
import type { Town, VisitKind } from "@/lib/admin/types"
import { NOW, PEOPLE as BASE_PEOPLE, RYAN, TECH, TODAY, WEEK_ANYTIME, WEEK_BLOCKS, WEEK_OFF, WEEK_START } from "@/components/blocks/scheduler-calendar-fixtures"
import type { GridBlock } from "@/components/blocks/time-grid-model"
import type { Meta, ProtoJob, ProtoState } from "./schedule-prototype-model"

// The Schedule prototype's fixtures: the week of Monday, Nov 23 2026 from the calendar blocks' own fixtures, a customer behind every visit (first names and
// streets only; a made-up phone or email, and one customer with neither), four jobs with no day and three visits whose customer has not been notified. Points are near each town's centre, spread by the visit's id so the map has something to draw and a visit never moves on a re-render.

export { NOW, RYAN, TECH, TODAY, WEEK_START }
/** Tech Two also works Saturdays here, so the week shows a sixth day; Ryan does not. */
export const PEOPLE = BASE_PEOPLE.map((p) => (p.id === TECH ? { ...p, workingDays: [...p.workingDays, "sat" as const] } : p))
/** One Saturday visit for Tech Two (Nov 28). */
const SATURDAY: GridBlock = { id: "v25", day: addDays(WEEK_START, 5), personId: TECH, start: 10 * 60, minutes: 60, title: "Sage Ct", name: "Ola", kind: "turn-on", town: "Firestone", service: "Spring turn-on" }

const LAST = ["Reyes", "Hart", "Reed", "Lund", "Ortiz", "Weber", "Alder", "Voss", "Patel", "Cho"]
const hash = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7)

/** A point near the town's centre, the same every time for one id. */
export function pointNear(town: Town, id: string): { lat: number; lng: number } {
  const [lng, lat] = TOWN_CENTRES[town]
  const h = hash(id)
  return { lat: Number((lat + ((h % 41) - 20) / 1000).toFixed(5)), lng: Number((lng + (((h >> 3) % 41) - 20) / 1000).toFixed(5)) }
}

const NO_CONTACT = new Set(["v5"])
const EMAIL_ONLY = new Set(["v18", "v21"])

function metaOf(b: GridBlock, i: number): Meta {
  const pin = pointNear(b.town, b.id)
  const customer = `${b.name} ${LAST[i % LAST.length]}`
  const n = String(100 + i).padStart(4, "0")
  const phone = NO_CONTACT.has(b.id) || EMAIL_ONLY.has(b.id) ? undefined : `(970) 555-${n}`
  const email = NO_CONTACT.has(b.id) ? undefined : EMAIL_ONLY.has(b.id) || i % 3 === 0 ? `${b.name.toLowerCase()}@example.com` : undefined
  return { customer, phone, email, ...pin }
}

const SEED_NOT_TOLD: Record<string, { day: string; personId: string; start: number | null; minutes: number }> = {
  v5: { day: WEEK_START, personId: RYAN, start: 9 * 60 + 15, minutes: 60 },
  v8: { day: addDays(WEEK_START, 1), personId: RYAN, start: 13 * 60 + 30, minutes: 60 },
  v18: { day: addDays(WEEK_START, 1), personId: RYAN, start: 11 * 60, minutes: 60 },
}

export const JOBS: ProtoJob[] = [
  { id: "u-1", customer: "Andrea Reyes", town: "Erie", service: "Spring turn-on", length: "1 h", minutes: 60, kind: "turn-on", street: "Kenosha Dr", addedOn: "2026-11-09", phone: "(970) 555-0142", ...pointNear("Erie", "u-1") },
  { id: "u-2", customer: "Ben Alder", town: "Lafayette", service: "Repair", length: "1 h 30 min", minutes: 90, kind: "repair", street: "Mulberry St", addedOn: "2026-11-16", email: "ben@example.com", ...pointNear("Lafayette", "u-2") },
  { id: "u-3", customer: "Carla Voss", town: "Longmont", service: "Fall blowout", length: "30 min", minutes: 30, kind: "blowout", street: "Bross St", addedOn: "2026-11-20", phone: "(970) 555-0177", ...pointNear("Longmont", "u-3") },
  { id: "u-4", customer: "Dev Patel", town: "Erie", service: "Mid-season inspection", length: "1 h 30 min", minutes: 90, kind: "inspection", street: "Sherman St", addedOn: "2026-11-23", phone: "(970) 555-0188", ...pointNear("Erie", "u-4") },
]

/** The state a story starts from: the whole week, three visits not told, four jobs with no day. */
export function initialState(over: Partial<Pick<ProtoState, "timeOff" | "visits" | "unscheduled" | "meta" | "was">> = {}): ProtoState {
  const all: GridBlock[] = [...WEEK_BLOCKS, SATURDAY, ...WEEK_ANYTIME].map((b) => (SEED_NOT_TOLD[b.id] ? { ...b, notTold: true } : b))
  const visits = over.visits ?? all
  const meta: Record<string, Meta> = over.meta ?? {}
  if (!over.meta) visits.forEach((b, i) => (meta[b.id] = metaOf(b, i)))
  const was = over.was ?? (over.meta ? {} : Object.fromEntries(Object.entries(SEED_NOT_TOLD).filter(([id]) => visits.some((b) => b.id === id))))
  return { visits, was, unscheduled: over.unscheduled ?? JOBS, meta, timeOff: over.timeOff ?? WEEK_OFF, toast: null, seq: 0, notify: [] }
}

// The New job sheet's customers: picking one fills the address.
export const CUSTOMERS: { id: string; name: string; address: string; phone?: string; email?: string }[] = [
  { id: "c-1", name: "Andrea Reyes", address: "480 Briggs St, Erie", phone: "(970) 555-0142" },
  { id: "c-2", name: "Marcus Bell", address: "91 Main St, Longmont", phone: "(970) 555-0166", email: "marcus@example.com" },
  { id: "c-3", name: "Priya Shah", address: "330 Elm Dr, Lafayette", email: "priya@example.com" },
]
export const SERVICES: { key: string; name: string; kind: VisitKind; minutes: number }[] = [
  { key: "turn-on", name: "Spring turn-on", kind: "turn-on", minutes: 60 },
  { key: "inspection", name: "Mid-season inspection", kind: "inspection", minutes: 90 },
  { key: "blowout", name: "Fall blowout", kind: "blowout", minutes: 30 },
  { key: "repair", name: "Repair", kind: "repair", minutes: 60 },
]

/** The town named in an address, or null when it is none of the six. */
export function townOf(address: string): Town | null {
  const t = (Object.keys(TOWN_CENTRES) as Town[]).find((x) => address.toLowerCase().includes(x.toLowerCase()))
  return t ?? null
}
