import "server-only"
import type { AdminData } from "./types"

/** The database-backed `AdminData`. Task 6.7 fills it in; until then the message tells you what to set. */
export async function loadLiveAdminData(): Promise<AdminData> {
  throw new Error("live admin data is not wired yet; set ADMIN_DATA_SOURCE=fixtures")
}
