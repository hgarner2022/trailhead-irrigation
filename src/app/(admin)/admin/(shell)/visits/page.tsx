import "server-only"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/guard"

// Visits left the left column (docs/plans/2026-11-18-admin-holistic-design.md, section 4): the old grid is the Schedule's List view. An old link,
// bookmark, text or alert keeps working: `/admin/visits?visit=…` opens that visit's panel on the Schedule's List, and the filters (`money`, `work`) come
// with it. The old `?job=` was a filter on this page, so it becomes `?forJob=`.
export const dynamic = "force-dynamic"

export default async function VisitsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const params = new URLSearchParams({ view: "list" })
  for (const [key, value] of Object.entries(await searchParams)) {
    const one = Array.isArray(value) ? value[0] : value
    if (one === undefined || key === "view") continue
    params.set(key === "job" ? "forJob" : key, one)
  }
  redirect(`/admin/schedule?${params.toString()}`)
}
