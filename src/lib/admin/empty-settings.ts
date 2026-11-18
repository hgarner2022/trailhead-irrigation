import type { OrganizationSettings } from "./types"

/** What an organization has before anyone opens Settings: no people, no areas, no windows, no messages. */
export const EMPTY_SETTINGS: OrganizationSettings = {
  people: [],
  areas: [],
  windows: [],
  bufferPercentEarly: 0,
  bufferPercentLate: 0,
  fallTownOrder: [],
  springTownOrder: [],
  messages: [],
  billing: { dueDays: 14, collectsSalesTax: false, salesTaxPercent: 0 },
}
