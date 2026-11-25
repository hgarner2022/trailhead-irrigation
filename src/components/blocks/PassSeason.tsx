import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { Job } from "@/lib/admin/jobs"
import type { Pass } from "@/lib/admin/types"
import { StatusPills } from "./StatusPill"
import { RECORD_ROW, RecordFacts, RecordList, RecordRowEnd, RecordRowText } from "./RecordPanel"
import { SectionHeading } from "./SectionHeading"
import { PassCard } from "./PassCard"
import { SeasonLine } from "./SeasonLine"

// One Season Pass's season as the office reads it (Hannah liked this view of the old Passes panel and asked to keep it):
// the pass card and its facts, the consent and the card line, the visits with their day, person and pills, the season line,
// and what each visit is charged and whether it was paid. Pure props, no data of its own: the Jobs panel shows it for a pass
// job and the Customers panel under the customer's facts, each handing in the same rows from `passes-model.ts`. A visit row
// opens its panel when `onOpenVisit` is given and is plain text without it. The pass's own buttons sit beside it in the panel
// that shows it, never inside it. `variant="customer"` is the Customers panel's block (the design's Season Pass: the card over its facts and
// the season line, no Visits, Charges or card line: the visits live in the job and the card is a fact of the customer). Server-safe: no hooks.

export interface PassSeasonVisit {
  /** the visit row's id; absent when the pass has no row yet */
  id?: string
  name: string
  /** "Apr 26, 8 to 10 am, Ryan Garner": the day, the window and who has it; empty before there is a day */
  detail?: string
  /** the visit's two pills, read from `src/lib/admin/jobs.ts` */
  job: Job
}

export interface PassSeasonCharge {
  name: string
  when: string
  amount: string
  /** "Paid Apr 20", blank before */
  paid: string
}

export interface PassSeasonProps {
  /** the pass: its card, its season line and its visits */
  pass: Pass
  /** ISO datetime the season line's marker is read from */
  today: string
  /** the facts beside the card: Town, Zones, Access, Status, Money */
  facts: [string, ReactNode][]
  /** the consent line, already in words; left out where the panel shows the consent history itself (the Customers panel) */
  consent?: string
  /** the card line, already in words: "Card ending 4242, expires 08/28" */
  card: string
  /** a button beside the card line (Send card link), when the viewer may use it */
  cardAction?: ReactNode
  /** a pending pass says it is an unpaid attempt */
  pendingNote?: string
  visits: PassSeasonVisit[]
  charges: PassSeasonCharge[]
  onOpenVisit?: (visitId: string) => void
  /** `job` is the Jobs panel's whole season; `customer` is the card, its facts and the season line only */
  variant?: "job" | "customer"
  /** the headings' ids are `${idPrefix}-visits` and so on, so two blocks on a page never share one */
  idPrefix?: string
  className?: string
}

function VisitRow({ visit, onOpen }: { visit: PassSeasonVisit; onOpen?: (id: string) => void }) {
  const inner = (
    <>
      <RecordRowText title={visit.name} detail={visit.detail} />
      <RecordRowEnd>
        <StatusPills job={visit.job} />
      </RecordRowEnd>
    </>
  )
  const cls = cn("flex min-h-11 w-full items-center text-left", RECORD_ROW)
  return visit.id && onOpen ? (
    <button type="button" className={cn(cls, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")} onClick={() => onOpen(visit.id!)}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

export function PassSeason({ pass, today, facts, consent, card, cardAction, pendingNote, visits, charges, onOpenVisit, variant = "job", idPrefix = "pass", className }: PassSeasonProps) {
  const compact = variant === "customer"
  return (
    <div data-slot="pass-season" className={cn("flex flex-col gap-6", className)}>
      {/* The card over its facts on a phone, beside them from sm up, so the facts never wrap a letter to a line. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <PassCard pass={pass} size="thumb" interactive={false} className="shrink-0" />
        <RecordFacts rows={facts} className="mt-0 min-w-0 flex-1" />
      </div>
      {pendingNote && (
        <p data-slot="pass-pending-note" className="text-sm text-muted-foreground">
          {pendingNote}
        </p>
      )}
      {/* On their own lines, not in the facts grid: beside the thumbnail on a phone they would wrap four deep. */}
      {consent && (
        <p data-slot="pass-consent" className="text-sm">
          <span className="text-muted-foreground">Consent </span>
          <span className="font-medium">{consent}</span>
        </p>
      )}
      {!compact && (
        <div data-slot="pass-card-line" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <p className="font-medium">{card}</p>
          {cardAction}
        </div>
      )}
      {!compact && (
      <section aria-labelledby={`${idPrefix}-visits`}>
        <SectionHeading id={`${idPrefix}-visits`}>Visits</SectionHeading>
        <RecordList data-slot="pass-jobs">
          {visits.map((visit, i) => (
            <li key={visit.id ?? `${visit.name}-${i}`}>
              <VisitRow visit={visit} onOpen={onOpenVisit} />
            </li>
          ))}
        </RecordList>
      </section>
      )}
      <section aria-labelledby={compact ? undefined : `${idPrefix}-season`} aria-label={compact ? "Season" : undefined}>
        {!compact && <SectionHeading id={`${idPrefix}-season`}>Season</SectionHeading>}
        <SeasonLine mode="customer" season={pass.season} visits={pass.visits} today={today} className={compact ? undefined : "mt-3"} />
      </section>
      {!compact && (
      <section aria-labelledby={`${idPrefix}-charges`}>
        <SectionHeading id={`${idPrefix}-charges`}>Charges</SectionHeading>
        <RecordList>
          {charges.map((row) => (
            <li key={row.name} className={cn("flex items-center", RECORD_ROW)}>
              <RecordRowText title={row.name} detail={row.when} />
              <RecordRowEnd>
                <span className="block tabular-nums">{row.amount}</span>
                <span className="block text-muted-foreground">{row.paid}</span>
              </RecordRowEnd>
            </li>
          ))}
        </RecordList>
      </section>
      )}
    </div>
  )
}
