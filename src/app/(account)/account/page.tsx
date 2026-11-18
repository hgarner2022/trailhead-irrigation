import "server-only"
import type { Metadata } from "next"
import { changeMyDay } from "./actions"
import { customerCtx, loadAccount, loadDays, loadNewestPass } from "./account-data"
import { nextVisit } from "./_screens/account-model"
import { HomeScreen } from "./_screens/HomeScreen"
import { NotACustomer } from "./_screens/NotACustomer"

export const metadata: Metadata = { title: "Your account" }
// Always the signed-in customer's own account, read fresh.
export const dynamic = "force-dynamic"

/** Home: the invoice to pay, the next visit with Change my day, the Season Pass card, and the latest jobs. */
export default async function AccountHomePage() {
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { customer, jobs, today } = await loadAccount(ctx)
  const next = nextVisit(jobs, today)
  const [days, passData] = await Promise.all([next?.visit.change === "yes" ? loadDays(ctx, [next.visit.id]) : {}, customer.hasHeldPass ? loadNewestPass(ctx) : null])
  return <HomeScreen jobs={jobs} today={today} pass={passData?.pass ?? null} days={days} onChangeDay={changeMyDay} />
}
