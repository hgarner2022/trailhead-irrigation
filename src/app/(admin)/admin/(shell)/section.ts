import type { AdminSection } from "@/components/blocks/AdminShell"

const SECTIONS: readonly AdminSection[] = ["schedule", "visits", "customers", "reports", "settings"]

/** Which rail item a path lights: `/admin` is Home, `/admin/passes/...` is Visits, anything else falls back to Home. */
export function sectionOf(pathname: string | null | undefined): AdminSection {
  const first = (pathname ?? "").split("?")[0]!.split("/").filter(Boolean)[1]
  // A pass is opened from a visit, so its page lights Visits; Revenue moved into Reports.
  if (first === "passes") return "visits"
  if (first === "revenue") return "reports"
  return SECTIONS.find((s) => s === first) ?? "home"
}
