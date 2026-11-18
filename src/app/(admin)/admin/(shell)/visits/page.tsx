import "server-only"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/guard"

// Visits left the left column (docs/plans/2026-11-18-admin-holistic-design.md, section 4): the old grid is the Schedule's List view. An old link,
// bookmark, text or alert keeps working: `/admin/visits?visit=…` opens that visit's panel on the Schedule's List, and the filters (`money`, `work`) come
// with it. The old `?job=` was a filter on this page, so it becomes `?forJob=`.
export const dynamic = "force-dynamic"

export default async function VisitsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const raw = await searchParams
  const params = new URLSearchParams({ view: "list" })
  // only what the old page took (the visit, its filters and a job to filter to), in a fixed order; an explicit `forJob` beats the old `job`
  for (const [from, to] of [["visit", "visit"], ["money", "money"], ["work", "work"], ["job", "forJob"], ["forJob", "forJob"]] as const) {
    const value = Array.isArray(raw[from]) ? raw[from][0] : raw[from]
    if (value) params.set(to, value)
  }
  redirect(`/admin/schedule?${params.toString()}`)
}
