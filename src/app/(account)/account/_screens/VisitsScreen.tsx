import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { EmptyState } from "@/components/blocks/EmptyState"
import { VisitRow } from "@/components/blocks/VisitRow"
import { Button } from "@/components/ui/button"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import { portalTimeline, type TimelineRow } from "@/lib/portal/timeline"
import { cn } from "@/lib/utils"

// Visits: the one timeline (docs/plans/2026-11-18-customer-portal-v2-design.md, section 3). "Coming up" then "Past", one row per visit with its day, what it is, the Season Pass
// label, the street when there are two properties, the money word and one pill; every row opens the visit page. A customer with two properties gets a street filter
// (links, so the filter is the URL). Pure composition over `portalTimeline`.

export interface VisitsScreenProps {
  customer: PortalCustomerType
  jobs: PortalJobType[]
  today: string
  /** the street the list is limited to; absent for all of them */
  street?: string | null
}

const rowOf = (r: TimelineRow) => (
  <VisitRow key={r.id} href={r.href} dayWords={r.dayWords} service={r.service} label={r.label} street={r.street} who={r.who} money={r.money} tone={r.tone} pill={r.pill} receiptHref={r.receiptId ? `/account/receipts/${r.receiptId}` : null} />
)

function Section({ id, title, rows, empty }: { id: string; title: string; rows: TimelineRow[]; empty: string }) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="font-display text-2xl font-semibold leading-none text-navy">
        {title}
      </h2>
      {rows.length ? <ul className="divide-y divide-border rounded-lg border border-border bg-background px-4">{rows.map(rowOf)}</ul> : <p className="text-base text-muted-foreground">{empty}</p>}
    </section>
  )
}

function StreetFilter({ streets, street }: { streets: string[]; street?: string | null }) {
  return (
    <nav aria-label="Property" data-slot="street-filter" className="flex flex-wrap gap-2">
      {[...streets, null].map((s) => (
        <Link
          key={s ?? "all"}
          href={s ? `/account/visits?street=${encodeURIComponent(s)}` : "/account/visits"}
          aria-current={(street ?? null) === s ? "page" : undefined}
          className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", (street ?? null) === s ? "border-primary-dark bg-primary/10 text-primary-deep" : "border-border text-navy-light hover:bg-stone")}
        >
          {s ?? "All"}
        </Link>
      ))}
    </nav>
  )
}

export function VisitsScreen({ customer, jobs, today, street }: VisitsScreenProps) {
  const all = portalTimeline(customer, jobs, today)
  const keep = (r: TimelineRow) => !street || r.job.address === street
  const upcoming = all.upcoming.filter(keep)
  const past = all.past.filter(keep)
  return (
    <main data-slot="account-visits" className="mx-auto max-w-3xl space-y-8 container-padding-x py-8">
      <h1 className="font-display text-[1.75rem] font-semibold leading-none text-navy">Visits</h1>
      {all.streets.length > 1 && <StreetFilter streets={all.streets} street={street} />}
      {all.upcoming.length + all.past.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No visits yet."
          line="When we book your work, every visit shows up here with its day."
          action={
            <Button asChild variant="outline">
              <a href="/book">Book Online</a>
            </Button>
          }
        />
      ) : (
        <>
          <Section id="visits-coming" title="Coming up" rows={upcoming} empty="Nothing booked right now." />
          <Section id="visits-past" title="Past" rows={past} empty="No past visits yet." />
        </>
      )}
    </main>
  )
}
