import Link from "next/link"
import { InvoiceBanner } from "@/components/blocks/InvoiceBanner"
import { JobRow } from "@/components/blocks/JobRow"
import { NextVisitCard } from "@/components/blocks/NextVisitCard"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { PortalJobType } from "@/api/v1/portal/schemas"
import type { Pass } from "@/lib/admin/types"
import type { ActionResult } from "../pass/_screens/CancelPassDialog"
import { seasonCaption } from "../pass/_screens/pass-page-model"
import { jobMoneyWord, nextVisit, openInvoices, visitsLineOf } from "./account-model"
import { ChangeMyDay } from "./ChangeMyDay"

// Home: the account's one screen most customers ever open (docs/plans/2026-11-18-customer-portal-design.md, section 4). In order: the invoice
// waiting to be paid, the next visit with Change my day, the Season Pass card over its season line (for someone who holds one), and the
// latest three jobs. A customer with only one-off jobs gets everything but the pass card. Pure composition over the data the page loads.

export interface HomeScreenProps {
  jobs: PortalJobType[]
  /** ISO day */
  today: string
  /** the newest pass the customer holds, with the card and season line; absent for a customer who never held one */
  pass?: Pass | null
  /** the days `visits.areaDays` offers for the visits the customer may change, by visit id */
  days?: Record<string, string[]>
  onChangeDay?: (visitId: string, day: string) => ActionResult | Promise<ActionResult>
}

export function HomeScreen({ jobs, today, pass, days = {}, onChangeDay }: HomeScreenProps) {
  const invoices = openInvoices(jobs)
  const next = nextVisit(jobs, today)
  const offered = next ? (days[next.visit.id] ?? []) : []
  const latest = jobs.slice(0, 3)
  return (
    <main data-slot="account-home" className="mx-auto max-w-5xl space-y-6 container-padding-x py-8">
      <h1 className="sr-only">Your Trailhead account</h1>
      {invoices.map((i) => (
        <InvoiceBanner key={i.id} jobName={i.jobName} total={i.total} dueOn={i.dueOn} status={i.status} payHref={i.payHref} />
      ))}
      <div className="grid gap-6 lg:grid-cols-2">
        <NextVisitCard
          visit={next?.visit ?? null}
          change={next?.visit.change}
          canPick={offered.length > 0}
          action={next && next.visit.change === "yes" ? <ChangeMyDay name={next.visit.name} visitId={next.visit.id} currentDay={next.visit.scheduledOn} days={offered} onPick={onChangeDay} /> : undefined}
        />
        {pass && (
          <Card data-slot="home-pass">
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
      <section aria-labelledby="home-jobs" className="space-y-2">
        <h2 id="home-jobs" className="font-display text-2xl font-semibold leading-none text-navy">
          Your jobs
        </h2>
        {latest.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-background px-4">
            {latest.map((j) => (
              <JobRow key={j.id} href={`/account/jobs/${j.id}`} name={j.name} soldOn={j.soldOn} visitsLine={visitsLineOf(j)} total={j.total} money={jobMoneyWord(j)} canceled={j.canceled} />
            ))}
          </ul>
        ) : (
          <p className="text-base text-muted-foreground">Nothing here yet. Your work will show up as soon as we book it.</p>
        )}
        {jobs.length > 0 && (
          <Link href="/account/jobs" className="inline-block text-base font-semibold text-primary-deep underline underline-offset-2">
            See all jobs
          </Link>
        )}
      </section>
    </main>
  )
}
