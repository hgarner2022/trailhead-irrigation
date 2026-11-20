import Link from "next/link"
import { InvoiceBanner } from "@/components/blocks/InvoiceBanner"
import { NextVisitCard } from "@/components/blocks/NextVisitCard"
import { PassCard } from "@/components/blocks/PassCard"
import { PassSellCard } from "@/components/blocks/PassSellCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { VisitRow } from "@/components/blocks/VisitRow"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Grid, GridCol, Stack } from "@/components/ui/grid"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import type { Pass } from "@/lib/admin/types"
import { nextRow, portalTimeline } from "@/lib/portal/timeline"
import { visitPageOf } from "@/lib/portal/visit-page"
import { withBookedTime, type BookedTimes } from "@/lib/portal/booked-time"
import type { DayTimeOffer } from "@/lib/booking/day-time"
import { seasonCaption } from "../pass/_screens/pass-page-model"
import { openInvoices } from "./account-model"
import { VisitControls, type VisitActions } from "./VisitControls"

// Home: the account's one screen most customers ever open (docs/plans/2026-11-19-customer-side-polish-research.md, section 1a). In order: the invoice waiting to be paid on top (Hannah, Nov 20 2026: what the customer must act on comes first), then the next visit with its exact
// time as the headline and Reschedule as the one filled button (Cancel visit a quiet link, or Text Ryan inside 24 hours), the Season Pass
// card over its season line for someone who holds one or the pass sell card for someone who does not, and the three latest visits. On a laptop it is a 12-column grid: the
// visit and invoice take seven columns, the pass or the sell card five, recent visits the full width under both; one column on a phone. Spacing is the 8-point scale through
// `Stack` and `Grid`. Pure composition over the data the page loads; the server actions arrive through `VisitActions`.

export interface HomeScreenProps extends VisitActions {
  customer: PortalCustomerType
  jobs: PortalJobType[]
  /** ISO day */
  today: string
  /** the newest pass the customer holds, with the card and season line; absent for a customer who never held one */
  pass?: Pass | null
  /** the days `visits.areaDays` offers for the visits the customer may reschedule, by visit id, up to five each */
  days?: Record<string, string[]>
  /** with slots: the booked start of each visit ("10:30"), and the open days with their start times for the next visit's Reschedule */
  times?: BookedTimes
  offers?: Record<string, readonly DayTimeOffer[]>
}

export function HomeScreen({ customer, jobs, today, pass, days = {}, times, offers, onReschedule, onRescheduleTime, onCancel }: HomeScreenProps) {
  const invoices = openInvoices(jobs)
  const timeline = portalTimeline(customer, jobs, today)
  const next = nextRow(timeline)
  const start = next ? times?.[next.id] : undefined
  const model = next ? withBookedTime(visitPageOf(next.job, next.visit, customer, today), start, { scheduled: next.visit.status === "scheduled", who: next.visit.personFirstName, told: next.visit.windowTold }) : null
  const recent = timeline.past.slice(0, 3)
  return (
    <main data-slot="account-home" className="mx-auto max-w-5xl container-padding-x py-8 sm:py-12">
      <h1 className="sr-only">Your Trailhead account</h1>
      <Stack gap="xl">
        <Grid cols={{ base: 1, lg: 12 }} gap="lg">
          <GridCol span={{ base: "full", lg: 7 }}>
            <Stack gap="lg">
              {invoices.length > 0 && (
                <section aria-label={invoices.length > 1 ? "Invoices" : "Invoice"} data-slot="home-invoices">
                  <Stack gap="sm">
                    {invoices.map((i) => (
                      <InvoiceBanner key={i.id} jobName={i.jobName} total={i.total} dueOn={i.dueOn} status={i.status} payHref={i.payHref} />
                    ))}
                  </Stack>
                </section>
              )}
              <NextVisitCard
                visit={
                  next && model
                    ? {
                        heading: model.dayHeading,
                        detail: model.dayDetail,
                        service: next.service,
                        where: model.where,
                        label: next.label,
                        mustBeHome: next.visit.mustBeHome,
                        href: next.href,
                        actions: <VisitControls job={next.job} visit={next.visit} today={today} days={days[next.id]} offers={offers?.[next.id]} currentStart={start} textHref={model.textHref} onReschedule={onReschedule} onRescheduleTime={onRescheduleTime} onCancel={onCancel} />,
                      }
                    : null
                }
              />
            </Stack>
          </GridCol>
          <GridCol span={{ base: "full", lg: 5 }}>
            {pass ? (
              <Card data-slot="home-pass">
                <CardContent className="p-4 sm:p-6">
                  <Stack gap="md">
                    <PassCard pass={pass} priority className="w-full" />
                    {pass.status === "cancelled" && (
                      <p data-slot="pass-canceled" className="text-base text-foreground">
                        {`Your ${pass.season} Season Pass is canceled. Nothing more will be charged. `}
                        <a href="/book" className="font-semibold text-primary-deep underline underline-offset-2">
                          Book Online
                        </a>
                      </p>
                    )}
                    <SeasonLine mode="customer" season={pass.season} visits={pass.visits} preferences={pass} today={today} caption={seasonCaption(pass)} />
                    <Button asChild variant="outline">
                      <Link href="/account/pass">See your pass</Link>
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <PassSellCard />
            )}
          </GridCol>
        </Grid>
        {recent.length > 0 && (
          <section aria-labelledby="home-recent">
            <Stack gap="md">
              <SectionHeading id="home-recent" level={2}>
                Recent visits
              </SectionHeading>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card px-4 shadow-sm sm:px-6">
                {recent.map((r) => (
                  <VisitRow key={r.id} href={r.href} dayWords={r.dayWords} service={r.service} label={r.label} street={r.street} who={r.who} money={r.money} tone={r.tone} pill={r.pill} receiptHref={r.receiptId ? `/account/receipts/${r.receiptId}` : null} />
                ))}
              </ul>
              <Link href="/account/visits" className="inline-flex min-h-11 items-center text-base font-semibold text-primary-deep underline underline-offset-2">
                See all visits
              </Link>
            </Stack>
          </section>
        )}
      </Stack>
    </main>
  )
}
