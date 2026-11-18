import "server-only"
import { redirect } from "next/navigation"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { jobIdOfPass, jobUrl } from "@/lib/admin/links"

// The Passes page is the Jobs screen now: a pass is a job. An old link, `/admin/passes?pass=<passId>`, opens that pass's job in
// its panel; `/admin/passes` alone opens the Jobs screen filtered to Season Passes.
export const dynamic = "force-dynamic"

export default async function PassesPage({ searchParams }: { searchParams: Promise<{ pass?: string }> }) {
  await requireAdmin()
  const { pass } = await searchParams
  if (!pass) redirect("/admin/jobs?kind=pass")
  const jobId = jobIdOfPass(await getAdminData("live"), pass)
  redirect(jobId ? jobUrl(jobId) : "/admin/jobs?kind=pass")
}
