import "server-only"
import type { Metadata } from "next"
import { cancelMyVisit, changeMyDay } from "./actions"
import { customerCtx, loadAccount, loadDays, loadNewestPass } from "./account-data"
import { HomeScreen } from "./_screens/HomeScreen"
import { NotACustomer } from "./_screens/NotACustomer"
import { nextRow, portalTimeline } from "@/lib/portal/timeline"

export const metadata: Metadata = { title: "Your account" }
// Always the signed-in customer's own account, read fresh.
export const dynamic = "force-dynamic"

/** Home: the invoice to pay, the next visit with Reschedule and Cancel visit, the Season Pass card, and the latest visits. */
export default async function AccountHomePage() {
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { customer, jobs, today } = await loadAccount(ctx)
  const next = nextRow(portalTimeline(customer, jobs, today))
  const [days, passData] = await Promise.all([next?.visit.reschedule === "yes" ? loadDays(ctx, [next.id]) : {}, customer.hasHeldPass ? loadNewestPass(ctx) : null])
  return <HomeScreen customer={customer} jobs={jobs} today={today} pass={passData?.pass ?? null} days={days} onReschedule={changeMyDay} onCancel={cancelMyVisit} />
}
