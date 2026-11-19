import Link from "next/link"
import { Briefcase, Calendar, CalendarClock, FileText, MapPin, Receipt, UserRound, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// A record named inside a line of text, as a link (Hannah, Nov 19 2026: in "Past visits" the service is that job and the person is a
// person, and both should look like what they are). A small chip: the kind's icon, the name, a hairline and the cream hover of a row; the
// name is the link and a screen reader hears the kind first ("Job: Fall blowout"). `kind` picks the icon and the words (job, person, customer, invoice, receipt, visit, property, day): every record name on any screen is one.
// The label never wraps or ellipsises (wrapping is only between one chip and the next); a narrow place gives the short form. Pure render, server component.

export type RecordChipKind = "job" | "person" | "customer" | "invoice" | "receipt" | "visit" | "property" | "day"

const ICONS: Record<RecordChipKind, LucideIcon> = { job: Briefcase, person: UserRound, customer: UserRound, invoice: FileText, receipt: Receipt, visit: CalendarClock, property: MapPin, day: Calendar }
const KIND_WORDS: Record<RecordChipKind, string> = { job: "Job", person: "Person", customer: "Customer", invoice: "Invoice", receipt: "Receipt", visit: "Visit", property: "Property", day: "Day" }

export interface RecordChipProps {
  kind: RecordChipKind
  name: string
  href: string
  /** the short form shown below `md` ("Today" for "Today, Wed Nov 18"); the name from `md` up. A chip never breaks inside a word, so a narrow place gives the short form */
  short?: string
  className?: string
}

export function RecordChip({ kind, name, href, short, className }: RecordChipProps) {
  const Icon = ICONS[kind]
  return (
    <Link
      href={href}
      data-slot="record-chip"
      data-kind={kind}
      className={cn("inline-flex min-h-6 max-w-full items-start gap-1 rounded-full border border-border bg-stone px-2 py-0.5 align-middle text-sm font-medium text-primary-dark hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", className)}
    >
      <Icon className="mt-[3px] size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">{KIND_WORDS[kind]}: </span>
      {short ? (
        <>
          <span className="min-w-0 whitespace-nowrap md:hidden">{short}</span>
          <span className="hidden min-w-0 whitespace-nowrap md:inline">{name}</span>
        </>
      ) : (
        <span className="min-w-0 whitespace-nowrap">{name}</span>
      )}
    </Link>
  )
}
