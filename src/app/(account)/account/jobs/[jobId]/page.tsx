import "server-only"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { callApi } from "@/api/core/call"
import { ApiError } from "@/api/core/errors"
import { jobsGet } from "@/api/v1/portal/jobs"
import { today } from "@/api/v1/shared"
import { changeMyDay } from "../../actions"
import { customerCtx, loadDays, loadNewestPass } from "../../account-data"
import { JobScreen } from "../../_screens/JobScreen"
import { NotACustomer } from "../../_screens/NotACustomer"

export const metadata: Metadata = { title: "Job" }
export const dynamic = "force-dynamic"

/** One job: what was sold, its visits, and its money with each receipt. Another customer's job is not found. */
export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const job = await callApi(ctx, jobsGet, { id: jobId }).catch((error) => {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) notFound()
    throw error
  })
  const [days, passData] = await Promise.all([loadDays(ctx, job.visits.filter((v) => v.change === "yes").map((v) => v.id)), job.passId ? loadNewestPass(ctx) : null])
  const pass = passData?.passes.find((p) => p.id === job.passId) ?? null
  return <JobScreen job={job} today={today(ctx)} pass={pass} days={days} onChangeDay={changeMyDay} />
}
