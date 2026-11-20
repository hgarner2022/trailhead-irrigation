import type { AdminSection } from "./AdminShell"

const SECTIONS: readonly AdminSection[] = ["schedule", "requests", "jobs", "customers", "reports", "settings"]

/** Which rail item a path lights: `/admin` is Home, `/admin/passes/...` (a redirect to Jobs) is Jobs and `/admin/visits` (a redirect to the List) the Schedule, anything else falls back to Home. */
export function sectionOf(pathname: string | null | undefined): AdminSection {
  const first = (pathname ?? "").split("?")[0]!.split("/").filter(Boolean)[1]
  // The Passes page is the Jobs screen now; Revenue moved into Reports.
  if (first === "passes") return "jobs"
  if (first === "revenue") return "reports"
  // Visits is the Schedule's List view; /admin/visits redirects there.
  if (first === "visits") return "schedule"
  return SECTIONS.find((s) => s === first) ?? "home"
}
