// Storybook's stand-in for data.ts (aliased in .storybook/main.ts): the real
// module is server-only and reaches the database through ./live, neither of
// which belongs in a browser bundle. Stories get the fixture snapshot.
import type { AdminData } from "../types"
import snapshot from "../fixtures/snapshot.json"

export { EMPTY_SETTINGS } from "../empty-settings"
export type AdminDataSource = "fixtures" | "live"

export async function getAdminData(): Promise<AdminData> {
  return snapshot as AdminData
}
