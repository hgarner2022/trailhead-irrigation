import type { BusyBlock, CapacityKind, SeasonWindow, Town, Weekday } from "@/lib/admin/types"

/** The pieces of the organization the scheduler reads; the rows from `person`, `area` and the settings column fit these. */
export interface SchedPerson {
  id: string
  /** the person's name, "Ryan Garner" */
  name: string
  /** the truck they drive, as a label: "Truck 1"; null when they are off the schedule */
  truck: string | null
  workingDays: Weekday[]
  capacityByKind: Record<CapacityKind, number>
  active?: boolean
}

export interface SchedArea {
  id: string
  name: string
  towns: Town[]
  springOrder?: number
  fallOrder?: number
}

export interface SchedSettings {
  windows: SeasonWindow[]
  bufferPercentEarly: number
  bufferPercentLate: number
}

export type { BusyBlock, CapacityKind, SeasonWindow, Town, Weekday }

export type Preference = "earlier" | "recommended" | "later"

/** A visit already on someone's day (or being placed in this run): what it takes from the day. */
export interface Taken {
  personId: string
  day: string
  kind: string
  town: Town
  minutes: number
}

/** A "to schedule" visit. */
export interface SchedVisit {
  id: string
  kind: string
  town: Town
  preference?: Preference | null
  /** the property says the customer must be home, so they pick the day themselves; the scheduler never places it */
  mustBeHome?: boolean
  durationMinutes?: number | null
}

export interface Placement {
  visitId: string
  personId: string
  day: string
  durationMinutes: number
}

export interface Unplaced {
  visitId: string
  reason: string
}

export const TIME_ZONE = "America/Denver"

/** Minutes a visit takes when its row has no length yet (the audit's measured medians). */
export const DEFAULT_MINUTES: Record<string, number> = { "turn-on": 60, inspection: 90, blowout: 30, repair: 120, consult: 30, "rachio-install": 120 }
export const defaultMinutes = (kind: string): number => DEFAULT_MINUTES[kind] ?? 60

/** Spring covers the turn-on and the inspection; the blowout is fall. */
export const seasonOfKind = (kind: string): "spring" | "fall" => (kind === "blowout" ? "fall" : "spring")
