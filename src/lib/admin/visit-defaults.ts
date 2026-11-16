/** What New visit starts with: the minutes a kind of visit takes, and the price where the price list knows it. Safe in the browser. */
export const OFFICE_KINDS = ["turn-on", "inspection", "blowout", "repair", "install", "other"] as const
export type OfficeKind = (typeof OFFICE_KINDS)[number]

export const KIND_MINUTES: Record<OfficeKind, number> = { "turn-on": 60, inspection: 60, blowout: 45, repair: 120, install: 120, other: 60 }

/** Whole dollars where the price is fixed (`/pricing`: repair visit $145); a turn-on or blowout depends on zones and an install is quoted, so those start blank ("quote later"). */
export const KIND_PRICE: Partial<Record<OfficeKind, number>> = { repair: 145 }

export const KIND_LABEL: Record<OfficeKind, string> = { "turn-on": "Spring turn-on", inspection: "Mid-season inspection", blowout: "Fall blowout", repair: "Repair", install: "Installation", other: "Other" }

export const NOT_DONE_REASONS = ["could-not-get-in", "no-water", "customer-asked-to-wait", "other"] as const
export type NotDoneReason = (typeof NOT_DONE_REASONS)[number]
export const NOT_DONE_LABEL: Record<NotDoneReason, string> = { "could-not-get-in": "Could not get in", "no-water": "No water on", "customer-asked-to-wait": "Customer asked to wait", other: "Something else" }
