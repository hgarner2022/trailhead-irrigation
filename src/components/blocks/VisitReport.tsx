import { Tick } from "./Tick"
import { checkedItems, hasReport, type VisitReportData } from "@/emails/visit-report"
import { cn } from "@/lib/utils"

// "What we did" (Hannah, Nov 21 2026: "I thought the receipt was supposed to have the checklist of things that they did, including the photos"): the visit's checklist as a
// list of the items that were checked, each with a check mark, and the photos Ryan shared with the customer as a small grid. An unchecked item is never drawn, not even as "Not done"
// (Hannah, Nov 22 2026: "we should never send anything that's not checked"); the crew's checklist on the job page keeps showing them. The heading and the checked items are the only words:
// no caption, no note, no sentence of ours. The same block is on the receipt page, the pay page and (as HTML) the receipt and invoice emails (`src/emails/visit-report.ts`); a
// page that must leave it out (the invoice's "Include the visit report" is unchecked, or the visit is not done) does not render it, so there is never an empty heading.
// Pure props, server-safe.

export interface VisitReportProps {
  report: VisitReportData
  /** the id the page's `aria-labelledby` can use when two reports could share a page */
  id?: string
  className?: string
}

export function VisitReport({ report, id = "visit-report", className }: VisitReportProps) {
  if (!hasReport(report)) return null
  const items = checkedItems(report)
  return (
    <section data-slot="visit-report" aria-labelledby={`${id}-h`} className={cn("space-y-3", className)}>
      <h2 id={`${id}-h`} className="font-display text-xl text-navy">
        What we did
      </h2>
      {items.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((label) => (
            <li key={label} className="flex items-start gap-3 py-2.5">
              <Tick className="mt-1" />
              <span className="min-w-0 flex-1 text-base text-foreground">{label}</span>
            </li>
          ))}
        </ul>
      )}
      {report.photos.length > 0 && (
        <ul aria-label="Photos from the visit" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {report.photos.map((p, n) => (
            <li key={p.url}>
              {/* a private address on our own serving route, so next/image's optimiser has nothing to fetch */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${n + 1} of ${report.photos.length} from the visit`} className="aspect-[4/3] w-full rounded-lg border border-border object-cover" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
