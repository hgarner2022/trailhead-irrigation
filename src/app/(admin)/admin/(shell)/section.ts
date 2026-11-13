import type { AdminSection } from "@/components/blocks/AdminShell"

const SECTIONS: readonly AdminSection[] = ["schedule", "passes", "revenue", "customers", "settings"]

/** Which rail item a path lights: `/admin` is Home, `/admin/passes/...` is Passes, anything else falls back to Home. */
export function sectionOf(pathname: string | null | undefined): AdminSection {
  const first = (pathname ?? "").split("?")[0]!.split("/").filter(Boolean)[1]
  return SECTIONS.find((s) => s === first) ?? "home"
}
