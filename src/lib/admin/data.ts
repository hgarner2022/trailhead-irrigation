import type { AdminData } from "./types"
import snapshot from "./fixtures/snapshot.json"

export type AdminDataSource = "fixtures" | "live"

/** The one way screens read admin data. `live` arrives with the wiring plan. */
export async function getAdminData(
  source: AdminDataSource = (process.env.ADMIN_DATA_SOURCE as AdminDataSource | undefined) ?? "fixtures",
): Promise<AdminData> {
  if (source === "live") throw new Error("live admin data is not wired yet; set ADMIN_DATA_SOURCE=fixtures")
  return snapshot as AdminData
}
