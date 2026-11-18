import "server-only"
import type { Metadata } from "next"
import { customerCtx, loadAccount } from "../account-data"
import { JobsScreen } from "../_screens/JobsScreen"
import { NotACustomer } from "../_screens/NotACustomer"

export const metadata: Metadata = { title: "Jobs" }
export const dynamic = "force-dynamic"

/** Jobs: one row per job the customer has had, newest first. */
export default async function JobsPage() {
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { jobs } = await loadAccount(ctx)
  return <JobsScreen jobs={jobs} />
}
