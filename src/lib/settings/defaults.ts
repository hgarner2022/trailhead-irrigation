import type { AreaGroup, BillingSettings, CapacityKind, OrganizationSettings, Town } from "@/lib/admin/types"

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

/**
 * The windows for one season: turn-on April 15 to May 31 (Hannah, Nov 23 2026, confirmed twice), inspection July 1 to 31, blowout October 1 to November 15.
 * This is the one place the turn-on's dates are written in code: the booking form, the Season Pass price rules and the seed read it, and a test holds the admin
 * snapshot to it. The blowout's last day (Oct 31 in the snapshot, Nov 15 here) is an open question for Hannah and is left as it was.
 */
export const defaultWindows = (season: number): OrganizationSettings["windows"] => [
  { kind: "turn-on", opensOn: `${season}-04-15`, closesOn: `${season}-05-31`, leadWeeks: DEFAULT_LEAD_WEEKS["turn-on"] },
  { kind: "inspection", opensOn: `${season}-07-01`, closesOn: `${season}-07-31`, leadWeeks: DEFAULT_LEAD_WEEKS.inspection },
  { kind: "blowout", opensOn: `${season}-10-01`, closesOn: `${season}-11-15`, leadWeeks: DEFAULT_LEAD_WEEKS.blowout },
]

/**
 * The part of a window we recommend, month and day, for the kinds that have one (Hannah, Nov 23 2026: the turn-on's "Our recommended" is early to mid May, so
 * the days before it are "Early season" and the days after it "Late season"). A kind with none splits its window in thirds. Read through `timingRanges`
 * (src/lib/scheduling/timing.ts), by the scheduler and the booking form alike.
 */
export const RECOMMENDED_SPAN: Partial<Record<"turn-on" | "inspection" | "blowout", { from: string; to: string }>> = { "turn-on": { from: "05-01", to: "05-15" } }

/** Erie anchors a day and the second town rotates (Answers 1). */
export const DEFAULT_AREAS: Pick<AreaGroup, "name" | "towns">[] = [
  { name: "Erie and Firestone", towns: ["Erie", "Firestone"] },
  { name: "Longmont", towns: ["Longmont"] },
  { name: "Louisville and Lafayette", towns: ["Louisville", "Lafayette"] },
  { name: "Broomfield", towns: ["Broomfield"] },
]

/** Invoices due in two weeks and no sales tax, until the office saves Settings › Billing (Ryan has not yet said whether he collects Colorado sales tax). */
export const DEFAULT_BILLING: BillingSettings = { dueDays: 14, collectsSalesTax: false, salesTaxPercent: 0 }

/** The settings an organization starts with for `season`. People and areas are rows, so they are not here. */
export const defaultSettings = (season: number): Omit<OrganizationSettings, "people" | "areas"> => ({
  windows: defaultWindows(season),
  bufferPercentEarly: 25,
  bufferPercentLate: 15,
  fallTownOrder: DEFAULT_FALL_TOWN_ORDER,
  springTownOrder: DEFAULT_SPRING_TOWN_ORDER,
  messages: [],
  billing: DEFAULT_BILLING,
})

/** The text-reminder hour in Mountain time (Answers); the day-before text goes out in the daily run, which sets the real hour. */
export const DEFAULT_REMINDER_HOUR = 17

export const DEFAULT_SETTINGS = defaultSettings(2027)
