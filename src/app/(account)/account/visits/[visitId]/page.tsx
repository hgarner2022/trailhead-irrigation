import "server-only"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { googleCalendarUrl } from "@/emails/calendar"
import { readAppUrl } from "@/lib/env"
import { visitCalendarUrl } from "@/lib/messaging/tokens"
import { cancelMyVisit, changeMyDay } from "../../actions"
import { customerCtx, loadAccount, loadDays } from "../../account-data"
import { NotACustomer } from "../../_screens/NotACustomer"
import { VisitScreen } from "../../_screens/VisitScreen"

export const metadata: Metadata = { title: "Visit" }
export const dynamic = "force-dynamic"

/** One visit: its day, what it is, what it costs or what was paid, and what the customer may do about it. Another customer's visit is not found (it is not in this customer's jobs). */
export default async function VisitPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { customer, jobs, today } = await loadAccount(ctx)
  const job = jobs.find((j) => j.visits.some((v) => v.id === visitId))
  const visit = job?.visits.find((v) => v.id === visitId)
  if (!job || !visit) notFound()
  const days = visit.reschedule === "yes" ? (await loadDays(ctx, [visitId]))[visitId] : []
  // A booked visit adds to a calendar as an all-day event: its day is a promise, its window is a message.
  const origin = readAppUrl()
  const calendar =
    visit.status === "scheduled" && visit.scheduledOn
      ? { googleHref: googleCalendarUrl({ id: visit.id, name: visit.name.toLowerCase(), day: visit.scheduledOn, startTime: null, location: `${job.address}, ${job.town}`, icsUrl: "" }), icsHref: visitCalendarUrl(origin, visit.id) }
      : undefined
  return <VisitScreen customer={customer} job={job} visitId={visitId} today={today} days={days} calendar={calendar} onReschedule={changeMyDay} onCancel={cancelMyVisit} />
}
