import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Invoice, PassStatus } from "@/lib/admin/types"
import { JOB_WORDS, type JobState, type MoneyState, type WorkState } from "@/lib/admin/jobs"

// One chip for every status word in the app, coloured by what the status
// means for the business (docs/DESIGN.md, Copy): good outcomes green, a
// booked visit orange, past due red, and the quiet states grey. The label is
// the plain word in sentence case. Pure render, server component.
//
// The coloured pills sit on a 10% tint with an ink dark enough for 12px text
// (4.5:1 or better). Measured over white and over cream: positive-deep
// #166534 on bg-positive/10 is 6.23 and 5.99; primary-deep #92400E on
// bg-primary/10 is 6.36 and 6.13; destructive #B91C1C on bg-destructive/10
// is 5.45 and 5.25 (5.02 on stone). The lighter positive and warning inks
// only reach 4.2 to 4.4 on their tints, which is why they are not used here.

export type PillStatus = PassStatus | JobState | WorkState | MoneyState | Invoice["status"]

const LABELS: Record<PillStatus, string> = {
  ...JOB_WORDS,
  "not-done": "Not done",
  "not-yet": "Not yet",
  "bill-sent": "Bill sent",
  failed: "Failed",
  pending: "Pending",
  active: "Active",
  paid: "Paid",
  unpaid: "Unpaid",
  overdue: "Past due",
  lapsed: "Lapsed",
}

const GOOD = "bg-positive/10 text-positive-deep border-positive/30"
const BOOKED = "bg-primary/10 text-primary-deep border-primary/30"
const WAITING = "bg-stone text-foreground border-border"
const BAD = "bg-destructive/10 text-destructive border-destructive/30"
const OVER = "bg-stone text-muted-foreground border-border"

const TONES: Record<PillStatus, string> = {
  "needs-a-day": WAITING,
  scheduled: BOOKED,
  routed: BOOKED,
  done: GOOD,
  charged: GOOD,
  "charge-failed": BAD,
  "not-done": WAITING,
  "not-yet": OVER,
  "bill-sent": BOOKED,
  failed: BAD,
  cancelled: OVER,
  skipped: OVER,
  pending: WAITING,
  active: GOOD,
  paid: GOOD,
  unpaid: WAITING,
  overdue: BAD,
  lapsed: OVER,
}

/** The word shown for a status: "Past due" for overdue, "Needs a day" for a job with no day, else the status in sentence case. */
export const statusLabel = (status: PillStatus): string => LABELS[status]

export interface StatusPillProps {
  status: PillStatus
  /** Another word for the same status, in the status's colour: the customer's pass page says "Reserved" and "Booked" where the admin says "Not scheduled" and "Scheduled". */
  label?: string
  className?: string
  /** which of a visit's two pills this is */
  "data-pill"?: "work" | "money"
}

export function StatusPill({ status, label, className, ...rest }: StatusPillProps) {
  return (
    <Badge {...rest} data-slot="status-pill" data-status={status} variant="outline" className={cn("whitespace-nowrap", TONES[status], className)}>
      {label ?? statusLabel(status)}
    </Badge>
  )
}
