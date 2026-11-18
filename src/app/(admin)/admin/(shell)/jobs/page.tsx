import "server-only"
import type { Metadata } from "next"
import { JobsScreen } from "@/app/(admin)/admin/_screens/JobsScreen"
import { MONEY_OPTIONS, KIND_OPTIONS, STAGE_OPTIONS, filterFrom } from "@/app/(admin)/admin/_screens/jobs-model"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { jobActions } from "../job-action-set"
import { visitActions } from "../visit-action-set"

export const metadata: Metadata = { title: "Jobs" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ job?: string; visit?: string; money?: string; status?: string; kind?: string }> }) {
  const principal = await requireAdmin()
  const { job, visit, money, status, kind } = await searchParams
  const defaultFilters = [...filterFrom("money", money, MONEY_OPTIONS), ...filterFrom("stage", status, STAGE_OPTIONS), ...filterFrom("kind", kind, KIND_OPTIONS)]
  const data = await getAdminData("live")
  return <JobsScreen data={data} today={new Date().toISOString()} defaultJobId={job} defaultVisitId={visit} defaultFilters={defaultFilters} readOnly={principal.role === "tech"} actions={jobActions} visitActions={visitActions} />
}
