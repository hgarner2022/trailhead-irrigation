import type { AreaGroup, CapacityKind, OrganizationSettings, Town, Truck } from "@/lib/admin/types"

/**
 * What the scheduler runs on until Ryan saves Settings once. Every value here comes from the wiring plan's Answers and
 * the scheduling flow, not from Ryan, so `settings.get` reports `confirmed: false` until a change is logged.
 */
export const DEFAULTS_CONFIRMED = false

/** Visits of each kind that fit one truck-day (Answers 2). */
export const DEFAULT_CAPACITY: Record<CapacityKind, number> = { "turn-on": 8, inspection: 6, blowout: 14, repair: 4, other: 2 }

/** Weeks ahead each window is committed: spring 4, July 4, fall 2 (the fall forecast only sees a fortnight). */
export const DEFAULT_LEAD_WEEKS = { "turn-on": 4, inspection: 4, blowout: 2 } as const

export const DEFAULT_FALL_TOWN_ORDER: Town[] = ["Firestone", "Erie", "Longmont", "Broomfield", "Louisville", "Lafayette"]
export const DEFAULT_SPRING_TOWN_ORDER: Town[] = [...DEFAULT_FALL_TOWN_ORDER].reverse()

/** The windows for one season: turn-on May 1 to 31, inspection July 1 to 31, blowout October 1 to November 15. */
export const defaultWindows = (season: number): OrganizationSettings["windows"] => [
  { kind: "turn-on", opensOn: `${season}-05-01`, closesOn: `${season}-05-31`, leadWeeks: DEFAULT_LEAD_WEEKS["turn-on"] },
  { kind: "inspection", opensOn: `${season}-07-01`, closesOn: `${season}-07-31`, leadWeeks: DEFAULT_LEAD_WEEKS.inspection },
  { kind: "blowout", opensOn: `${season}-10-01`, closesOn: `${season}-11-15`, leadWeeks: DEFAULT_LEAD_WEEKS.blowout },
]

/** Two trucks, Monday to Friday, both on for the full season (April 1 to November 15, Answers 5). */
export const DEFAULT_TRUCKS: Pick<Truck, "name" | "workingDays" | "capacityByKind">[] = [
  { name: "Truck 1", workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: DEFAULT_CAPACITY },
  { name: "Truck 2", workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: DEFAULT_CAPACITY },
]

/** Erie anchors a day and the second town rotates (Answers 1). */
export const DEFAULT_AREAS: Pick<AreaGroup, "name" | "towns">[] = [
  { name: "Erie and Firestone", towns: ["Erie", "Firestone"] },
  { name: "Longmont", towns: ["Longmont"] },
  { name: "Louisville and Lafayette", towns: ["Louisville", "Lafayette"] },
  { name: "Broomfield", towns: ["Broomfield"] },
]

/** The settings an organization starts with for `season`. Trucks and areas are rows, so they are not here. */
export const defaultSettings = (season: number): Omit<OrganizationSettings, "trucks" | "areas"> => ({
  windows: defaultWindows(season),
  bufferPercentEarly: 25,
  bufferPercentLate: 15,
  fallTownOrder: DEFAULT_FALL_TOWN_ORDER,
  springTownOrder: DEFAULT_SPRING_TOWN_ORDER,
  messages: [],
})

/** The text-reminder hour in Mountain time (Answers); the day-before text goes out in the daily run, which sets the real hour. */
export const DEFAULT_REMINDER_HOUR = 17

export const DEFAULT_SETTINGS = defaultSettings(2027)
