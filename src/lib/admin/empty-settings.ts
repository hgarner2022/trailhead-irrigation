import type { OrganizationSettings } from "./types"

/** What an organization has before anyone opens Settings: no trucks, no areas, no windows, no messages. */
export const EMPTY_SETTINGS: OrganizationSettings = {
  trucks: [],
  areas: [],
  windows: [],
  bufferPercentEarly: 0,
  bufferPercentLate: 0,
  fallTownOrder: [],
  springTownOrder: [],
  messages: [],
}
