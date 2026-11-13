import type { BusyBlock, CapacityKind, SeasonWindow, Town, Weekday } from "@/lib/admin/types"

/** The pieces of the organization the scheduler reads; the rows from `truck`, `area` and the settings column fit these. */
export interface SchedTruck {
  id: string
  name: string
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

/** A visit already on a truck-day (or being placed in this run): what it takes from the day. */
export interface Taken {
  truckId: string
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
  /** the customer must be home and picks the day themselves; the scheduler never places it */
  needsCustomerHome?: boolean
  durationMinutes?: number | null
}

export interface Placement {
  visitId: string
  truckId: string
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
