import "server-only"
import type { AdminData } from "./types"
import snapshot from "./fixtures/snapshot.json"
import { loadLiveAdminData } from "./live"

export { EMPTY_SETTINGS } from "./empty-settings"

export type AdminDataSource = "fixtures" | "live"

/** `ADMIN_DATA_SOURCE`, defaulting to fixtures when unset; anything else is a configuration mistake. */
function sourceFromEnv(): AdminDataSource {
  const value = process.env.ADMIN_DATA_SOURCE
  if (value === undefined || value === "") return "fixtures"
  if (value === "fixtures" || value === "live") return value
  throw new Error(`unknown ADMIN_DATA_SOURCE "${value}"`)
}

/** The one way screens read admin data. `live` reads the database (`live.ts`); fixtures serve Storybook and local work. */
export async function getAdminData(source: AdminDataSource = sourceFromEnv()): Promise<AdminData> {
  if (source === "live") return loadLiveAdminData()
  return snapshot as AdminData
}
