import { InvoiceBanner } from "@/components/blocks/InvoiceBanner"
import { NextVisitCard } from "@/components/blocks/NextVisitCard"
import { PassCard } from "@/components/blocks/PassCard"
import { PreferenceAsk } from "@/components/blocks/PreferenceAsk"
import { Grid, GridCol, Stack } from "@/components/ui/grid"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import type { Pass, TimingPreference } from "@/lib/admin/types"
import { nextRow, portalTimeline } from "@/lib/portal/timeline"
import { preferenceOf } from "@/lib/admin/format"
import type { TimingKind } from "@/lib/portal/preference-words"
import { visitPageOf } from "@/lib/portal/visit-page"
import { withBookedTime, type BookedTimes } from "@/lib/portal/booked-time"
import type { DayTimeOffer } from "@/lib/booking/day-time"
import { openInvoices } from "./account-model"
import { VisitControls, type VisitActions } from "./VisitControls"

// Home: what is next, and the card (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)"). In order: the invoice waiting to be paid on top (Hannah, Nov 20 2026:
// what the customer must act on comes first), the quiet timing banner while we are asking for a preference, then the next visit with its exact time as the headline and Reschedule as the
// one filled button (Cancel visit a quiet link, or Text Ryan inside 24 hours), and the Season Pass card for someone who holds one. That is all: the visits are the Visits tab's, the plan is the
// Season Pass tab's, and a customer with no pass sees no pass on Home (the Season Pass tab explains it, once). On a laptop it is a 12-column grid, the visit and invoice seven columns and the card
// five; one column on a phone. Spacing is the 8-point scale through `Stack` and `Grid`. Pure composition over the data the page loads; the server actions arrive through `VisitActions`.

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
  /** the visit kind we are asking a timing for (the "Preference request" went out); absent when nothing is being asked */
  ask?: TimingKind
  /** the customer chose a timing in the banner's dialog */
  onSavePreference?: (kind: TimingKind, preference: TimingPreference) => void | Promise<unknown>
}

export function HomeScreen({ customer, jobs, today, pass, days = {}, times, offers, onReschedule, onRescheduleTime, onCancel, ask, onSavePreference }: HomeScreenProps) {
  const invoices = openInvoices(jobs)
  const timeline = portalTimeline(customer, jobs, today)
  const next = nextRow(timeline)
  const start = next ? times?.[next.id] : undefined
  const model = next ? withBookedTime(visitPageOf(next.job, next.visit, customer, today), start, { scheduled: next.visit.status === "scheduled", who: next.visit.personFirstName, told: next.visit.windowTold }) : null
  return (
    <main data-slot="account-home" className="mx-auto max-w-5xl container-padding-x py-8 sm:py-12">
      <h1 className="sr-only">Your Trailhead account</h1>
      <Stack gap="xl">
        <Grid cols={{ base: 1, lg: 12 }} gap="lg">
          <GridCol span={{ base: "full", lg: pass ? 7 : "full" }}>
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
              {ask && <PreferenceAsk kind={ask} value={(pass && preferenceOf(pass, ask)) || "recommended"} onSave={onSavePreference} />}
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
          {pass && (
            <GridCol span={{ base: "full", lg: 5 }}>
              <Stack gap="md" data-slot="home-pass">
                <PassCard pass={pass} priority className="w-full" />
                {pass.status === "cancelled" && (
                  <p data-slot="pass-canceled" className="text-base text-foreground">
                    {`Your ${pass.season} Season Pass is canceled. Nothing more will be charged. `}
                    <a href="/book" className="font-semibold text-primary-deep underline underline-offset-2">
                      Book Online
                    </a>
                  </p>
                )}
              </Stack>
            </GridCol>
          )}
        </Grid>
      </Stack>
    </main>
  )
}
