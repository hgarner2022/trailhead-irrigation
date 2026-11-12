import type { AdminData } from "./types"
import snapshot from "./fixtures/snapshot.json"

export type AdminDataSource = "fixtures" | "live"

/** `ADMIN_DATA_SOURCE`, defaulting to fixtures when unset; anything else is a configuration mistake. */
function sourceFromEnv(): AdminDataSource {
  const value = process.env.ADMIN_DATA_SOURCE
  if (value === undefined || value === "") return "fixtures"
  if (value === "fixtures" || value === "live") return value
  throw new Error(`unknown ADMIN_DATA_SOURCE "${value}"`)
}

/** The one way screens read admin data. `live` arrives with the wiring plan. */
export async function getAdminData(source: AdminDataSource = sourceFromEnv()): Promise<AdminData> {
  if (source === "live") throw new Error("live admin data is not wired yet; set ADMIN_DATA_SOURCE=fixtures")
  return snapshot as AdminData
}
