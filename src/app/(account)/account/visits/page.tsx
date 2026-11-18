import "server-only"
import type { Metadata } from "next"
import { customerCtx, loadAccount } from "../account-data"
import { NotACustomer } from "../_screens/NotACustomer"
import { VisitsScreen } from "../_screens/VisitsScreen"

export const metadata: Metadata = { title: "Visits" }
export const dynamic = "force-dynamic"

/** Visits: the one timeline, coming up then past, each in the customer's words; every row opens its visit. */
export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ street?: string }> }) {
  const { street } = await searchParams
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { customer, jobs, today } = await loadAccount(ctx)
  return <VisitsScreen customer={customer} jobs={jobs} today={today} street={street ?? null} />
}
