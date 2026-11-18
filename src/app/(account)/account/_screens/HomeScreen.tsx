import Link from "next/link"
import { InvoiceBanner } from "@/components/blocks/InvoiceBanner"
import { NextVisitCard } from "@/components/blocks/NextVisitCard"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { VisitRow } from "@/components/blocks/VisitRow"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import type { Pass } from "@/lib/admin/types"
import { nextRow, portalTimeline } from "@/lib/portal/timeline"
import { visitPageOf } from "@/lib/portal/visit-page"
import { seasonCaption } from "../pass/_screens/pass-page-model"
import { openInvoices } from "./account-model"
import { VisitControls, type VisitActions } from "./VisitControls"

// Home: the account's one screen most customers ever open (docs/plans/2026-11-18-customer-portal-v2-design.md, section 3). In order: the invoice waiting to be paid, the
// next visit with Reschedule and Cancel visit (or Text Ryan inside 24 hours), the Season Pass card over its season line for someone who holds one, and the three latest
// visits. On a laptop the invoice and the next visit stack on the left and the pass card sits on the right, both aligned to the top so neither card is stretched to the
// other's height. Pure composition over the data the page loads; the server actions arrive through `VisitActions`.

export interface HomeScreenProps extends VisitActions {
  customer: PortalCustomerType
  jobs: PortalJobType[]
  /** ISO day */
  today: string
  /** the newest pass the customer holds, with the card and season line; absent for a customer who never held one */
  pass?: Pass | null
  /** the days `visits.areaDays` offers for the visits the customer may reschedule, by visit id, up to five each */
  days?: Record<string, string[]>
}

export function HomeScreen({ customer, jobs, today, pass, days = {}, onReschedule, onCancel }: HomeScreenProps) {
  const invoices = openInvoices(jobs)
  const timeline = portalTimeline(customer, jobs, today)
  const next = nextRow(timeline)
  const model = next ? visitPageOf(next.job, next.visit, customer, today) : null
  const recent = timeline.past.slice(0, 3)
  return (
    <main data-slot="account-home" className="mx-auto max-w-5xl space-y-8 container-padding-x py-8">
      <h1 className="sr-only">Your Trailhead account</h1>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {invoices.map((i) => (
            <InvoiceBanner key={i.id} jobName={i.jobName} total={i.total} dueOn={i.dueOn} status={i.status} payHref={i.payHref} />
          ))}
          <NextVisitCard
            visit={
              next && model
                ? {
                    heading: model.dayHeading,
                    detail: model.dayDetail ?? "",
                    service: next.service,
                    where: model.where,
                    label: next.label,
                    mustBeHome: next.visit.mustBeHome,
                    href: next.href,
                    actions: <VisitControls job={next.job} visit={next.visit} today={today} days={days[next.id]} textHref={model.textHref} onReschedule={onReschedule} onCancel={onCancel} />,
                  }
                : null
            }
          />
        </div>
        {pass && (
          <Card data-slot="home-pass" className="self-start">
            <CardContent className="space-y-4 p-5">
              <PassCard pass={pass} priority className="w-full" />
              <SeasonLine mode="customer" season={pass.season} visits={pass.visits} preferences={pass} today={today} caption={seasonCaption(pass)} />
              <Button asChild variant="outline">
                <Link href="/account/pass">See your pass</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      {recent.length > 0 && (
        <section aria-labelledby="home-recent" className="space-y-2">
          <h2 id="home-recent" className="font-display text-2xl font-semibold leading-none text-navy">
            Recent
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-background px-4">
            {recent.map((r) => (
              <VisitRow key={r.id} href={r.href} dayWords={r.dayWords} service={r.service} label={r.label} street={r.street} who={r.who} money={r.money} tone={r.tone} pill={r.pill} receiptHref={r.receiptId ? `/account/receipts/${r.receiptId}` : null} />
            ))}
          </ul>
          <Link href="/account/visits" className="inline-block text-base font-semibold text-primary-deep underline underline-offset-2">
            See all visits
          </Link>
        </section>
      )}
    </main>
  )
}
