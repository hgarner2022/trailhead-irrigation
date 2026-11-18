import "server-only"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { view } from "@/api/v1/portal/me"
import { loadPortalJobs } from "@/api/v1/portal/load"
import { today as todayOf } from "@/api/v1/shared"
import { visitsAreaDays } from "@/api/v1/visits/handlers"
import { auth } from "@/auth"
import { googleCalendarUrl } from "@/emails/calendar"
import { readAppUrl } from "@/lib/env"
import { visitCalendarUrl } from "@/lib/messaging/tokens"
import { cancelMyVisit, cancelMyVisitByLink, changeMyDay, changeMyDayByLink } from "../../actions"
import { customerCtx, loadAccount, loadDays, visitLinkCtx } from "../../account-data"
import { NotACustomer } from "../../_screens/NotACustomer"
import { VisitScreen } from "../../_screens/VisitScreen"

// The page a text's link opens carries a token in its address; keep it out of the Referer header sent to anything we link to.
export const metadata: Metadata = { title: "Visit", referrer: "no-referrer" }
export const dynamic = "force-dynamic"

/**
 * One visit: its day, what it is, what it costs or what was paid, and what the customer may do about it. Another customer's visit is not found (it is not
 * in this customer's jobs). A text's link (`?t=`, `visitLinkUrl`) opens this page with no session, as the visit's own customer held to this one visit: the
 * token is checked here against the visit's customer and expiry, and the sheets get the token bound into their server actions. A wrong or expired link goes to sign-in.
 */
export default async function VisitPage({ params, searchParams }: { params: Promise<{ visitId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { visitId } = await params
  const { t } = await searchParams
  const signedIn = Boolean((await auth())?.principal)
  const byLink = Boolean(t) && !signedIn
  const origin = readAppUrl()

  let ctx: Ctx | null
  if (byLink) {
    ctx = await visitLinkCtx(visitId, t)
    if (!ctx) redirect("/account/sign-in")
  } else {
    ctx = await customerCtx()
    if (!ctx) return <NotACustomer />
  }
  const here: Ctx = ctx

  let customer, jobs, today: string
  if (byLink) {
    const customerId = (here.principal as { customerId: string }).customerId
    // Only this visit's job, with only this visit on it, and the customer without their yard: the link opens one visit and nothing else.
    const loaded = (await view(here, customerId).then(async (c) => [c, await loadPortalJobs(here, customerId)] as const))
    const job = loaded[1].find((j) => j.visits.some((v) => v.id === visitId))
    if (!job) notFound()
    customer = { ...loaded[0], properties: [] }
    jobs = [{ ...job, visits: job.visits.filter((v) => v.id === visitId) }]
    today = todayOf(here)
  } else {
    const account = await loadAccount(here)
    ;({ customer, jobs, today } = account)
  }

  const job = jobs.find((j) => j.visits.some((v) => v.id === visitId))
  const visit = job?.visits.find((v) => v.id === visitId)
  if (!job || !visit) notFound()
  const days = visit.reschedule === "yes" ? (byLink ? await callApi(here, visitsAreaDays, { id: visitId, count: 5 }).then((r) => r.days, () => []) : (await loadDays(here, [visitId]))[visitId]) : []
  // A booked visit adds to a calendar as an all-day event: its day is a promise, its window is a message.
  const calendar =
    visit.status === "scheduled" && visit.scheduledOn
      ? { googleHref: googleCalendarUrl({ id: visit.id, name: visit.name.toLowerCase(), day: visit.scheduledOn, startTime: null, location: `${job.address}, ${job.town}`, icsUrl: "" }), icsHref: visitCalendarUrl(origin, visit.id) }
      : undefined
  const onReschedule = byLink ? changeMyDayByLink.bind(null, t!) : changeMyDay
  const onCancel = byLink ? cancelMyVisitByLink.bind(null, t!) : cancelMyVisit
  return (
    <>
      <VisitScreen customer={customer} job={job} visitId={visitId} today={today} days={days} calendar={calendar} onReschedule={onReschedule} onCancel={onCancel} />
      {byLink && (
        <p className="mx-auto max-w-3xl container-padding-x pb-8 text-base">
          <Link href="/account" className="font-semibold text-primary-deep underline underline-offset-2">
            See your account
          </Link>
        </p>
      )}
    </>
  )
}
