import "server-only"
import type { Metadata } from "next"
import { changeMyDay } from "../actions"
import { customerCtx, loadAccount, loadDays } from "../account-data"
import { visitLists, visitsToOffer } from "../_screens/account-model"
import { NotACustomer } from "../_screens/NotACustomer"
import { VisitsScreen } from "../_screens/VisitsScreen"

export const metadata: Metadata = { title: "Visits" }
export const dynamic = "force-dynamic"

/** Visits: coming up, then past, each in the customer's words, with Change my day where the rule allows. */
export default async function VisitsPage() {
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { jobs, today } = await loadAccount(ctx)
  const days = await loadDays(ctx, visitsToOffer(visitLists(jobs, today).comingUp))
  return <VisitsScreen jobs={jobs} today={today} days={days} onChangeDay={changeMyDay} />
}
