import "server-only"
import { redirect } from "next/navigation"
import { customerCtx, loadAccount } from "../../account-data"
import { NotACustomer } from "../../_screens/NotACustomer"

export const dynamic = "force-dynamic"

/** The job page is gone: its visits are on the Visits timeline. An old link goes to the job's next live visit, else to Visits. */
export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { jobs } = await loadAccount(ctx)
  const visits = jobs.find((j) => j.id === jobId)?.visits ?? []
  const target = visits.find((v) => v.status === "scheduled" || v.status === "unscheduled") ?? visits[0]
  redirect(target ? `/account/visits/${target.id}` : "/account/visits")
}
