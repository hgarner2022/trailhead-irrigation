import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { PassStatus } from "@/lib/admin/types"
import { JOB_WORDS, REASON_WORDS, WORK_WORDS, type Job, type JobState, type MoneyState, type WorkState } from "@/lib/admin/jobs"

// The only status chip in the app (docs/DESIGN.md, "The recipe"), coloured by what the status
// means for the business (docs/DESIGN.md, Copy): good outcomes green, a
// booked visit orange, past due red, and the quiet states grey. The label is
// the plain word in sentence case. It sits under a panel's subtitle or at a row's right, never in a grid cell.
// A pill is a tint, a dot in the ink colour and the word (the Mailchimp badge, docs/plans/2026-11-19-admin-page-layout-research.md). `StatusPills` is a visit's two pills (it absorbed JobPill). Pure render, server component.
//
// The coloured pills sit on a 10% tint with an ink dark enough for 12px text
// (4.5:1 or better). Measured over white and over cream: positive-deep
// #166534 on bg-positive/10 is 6.23 and 5.99; primary-deep #92400E on
// bg-primary/10 is 6.36 and 6.13; destructive #B91C1C on bg-destructive/10
// is 5.45 and 5.25 (5.02 on stone). The lighter positive and warning inks
// only reach 4.2 to 4.4 on their tints, which is why they are not used here. Gold: warning-ink #854D0E on bg-warning/14 (gold #A16207 at 14%) is
// 5.70 over white, 5.49 over cream and 5.24 over stone; navy #2B3544 on bg-navy/10 is 10.4, 9.9 and 9.5.

/** A request's three words and a quote's six (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.5; Hannah, Nov 20 2026: a request has no accepted state, it becomes the job): New and Seen wait on Ryan (gold), Archived and the quote's Draft, Declined, Replaced and Archived are quiet (grey), a quote that is Sent waits on the customer (gold) and Approved is an outcome (green). */
export type RequestStatus = "request-new" | "request-seen" | "request-archived"
export type QuoteStatus = "quote-draft" | "quote-sent" | "quote-approved" | "quote-declined" | "quote-replaced" | "quote-archived"

export type PillStatus = PassStatus | JobState | WorkState | MoneyState | "overdue" | "waiting" | "today" | "job-active" | "refunded" | RequestStatus | QuoteStatus

const LABELS: Record<PillStatus, string> = {
  ...JOB_WORDS,
  "not-done": "Not done",
  "not-yet": "",
  "bill-sent": "Invoice sent",
  failed: "Failed",
  pending: "Pending",
  active: "Active",
  paid: "Paid",
  owed: "Unpaid",
  overdue: "Past due",
  lapsed: "Expired",
  waiting: "Waiting on customer",
  today: "Today",
  "job-active": "Active",
  refunded: "Refunded",
  "request-new": "New",
  "request-seen": "Seen",
  "request-archived": "Archived",
  "quote-draft": "Draft",
  "quote-sent": "Sent",
  "quote-approved": "Approved",
  "quote-declined": "Declined",
  "quote-replaced": "Replaced",
  "quote-archived": "Archived",
}

const GOOD = "bg-positive/10 text-positive-deep border-positive/30"
const GOLD = "bg-warning/14 text-warning-ink border-warning/40"
const BAD = "bg-destructive/10 text-destructive border-destructive/30"
const OVER = "bg-stone text-muted-foreground border-border"
// Booked and Today are the info tone (a navy tint: all is well, nothing to do until the day); Active (On my way sent, not yet done) is the progress tone, solid navy, because it is the one thing happening right now
const INFO = "bg-navy/10 text-navy border-navy/30"
const PROGRESS = "bg-navy text-white border-navy"

// Brand orange is never a status colour (Hannah, Nov 19 2026; docs/plans/2026-11-19-status-colours-research.md): orange is for actions.
// Green is an outcome (done, paid), navy is booked or happening, gold is waiting on a person, red is wrong, grey is over or not started.
const TONES: Record<PillStatus, string> = {
  "needs-a-day": GOLD,
  scheduled: INFO,
  routed: INFO,
  done: GOOD,
  charged: GOOD,
  "charge-failed": BAD,
  "not-done": GOLD,
  "not-yet": OVER,
  "bill-sent": GOLD,
  failed: BAD,
  cancelled: OVER,
  skipped: OVER,
  pending: GOLD,
  active: GOOD,
  paid: GOOD,
  owed: GOLD,
  overdue: BAD,
  lapsed: OVER,
  waiting: GOLD,
  today: INFO,
  "job-active": PROGRESS,
  refunded: OVER,
  "request-new": GOLD,
  "request-seen": GOLD,
  "request-archived": OVER,
  "quote-draft": OVER,
  "quote-sent": GOLD,
  "quote-approved": GOOD,
  "quote-declined": OVER,
  "quote-replaced": OVER,
  "quote-archived": OVER,
}

/** The word shown for a status: "Past due" for overdue, "Unscheduled" for a job with no day, else the status in sentence case. */
export const statusLabel = (status: PillStatus): string => LABELS[status]

export interface StatusPillProps {
  status: PillStatus
  /** Another word for the same status, in the status's colour: the customer's pass page says "Reserved" and "Booked" where the admin says "Not scheduled" and "Scheduled". */
  label?: string
  className?: string
  /** `lg` (14px) is for the badge beside a page's title; every other place is `sm` */
  size?: "sm" | "lg"
  /** which of a visit's two pills this is */
  "data-pill"?: "work" | "money" | "waiting"
}

export function StatusPill({ status, label, size = "sm", className, ...rest }: StatusPillProps) {
  const word = label ?? statusLabel(status)
  // "not-yet" has no word: nothing is due yet, so nothing is drawn
  if (!word) return null
  return (
    <Badge {...rest} data-slot="status-pill" data-status={status} data-size={size} variant="outline" className={cn("gap-1.5 whitespace-nowrap rounded-full", size === "lg" && "px-3 py-1 text-sm", TONES[status], className)}>
      <span aria-hidden data-slot="status-dot" className="size-1.5 shrink-0 rounded-full bg-current" />
      {word}
    </Badge>
  )
}

export interface StatusPillsProps {
  job: Job
  /** Ryan moved the visit and asked the customer to reply YES (a property that must be home): a neutral third pill until they answer or the office clears it */
  waiting?: boolean
  className?: string
}

/**
 * A visit's two pills (owner, 14 Nov): WORK says what happened to the stop (Unscheduled, Scheduled, Done, Not done with its reason after
 * the pill, Canceled) and MONEY says whether it was paid (nothing until the visit is done, then Paid with how, Unpaid, Invoice sent,
 * Failed, all read from the payment rows by src/lib/money/words.ts). A Scheduled visit whose day has passed keeps its state and gains
 * a small "day passed" note.
 */
export function StatusPills({ job, waiting, className }: StatusPillsProps) {
  return (
    <span data-slot="job-pill" className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <StatusPill status={job.work} label={WORK_WORDS[job.work]} data-pill="work" />
      {waiting && <StatusPill status="waiting" data-pill="waiting" />}
      {job.reason && (
        <span data-slot="not-done-reason" className="text-xs text-muted-foreground">
          {`· ${REASON_WORDS[job.reason] ?? job.reason}`}
        </span>
      )}
      {job.dayPassed && (
        <span data-slot="day-passed" className="text-xs text-muted-foreground">
          day passed
        </span>
      )}
      {job.moneyLabel && <StatusPill status={job.money} label={job.moneyLabel} data-pill="money" />}
    </span>
  )
}
