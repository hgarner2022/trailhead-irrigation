import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Invoice, PassStatus, VisitStatus } from "@/lib/admin/types"

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

export type PillStatus = PassStatus | VisitStatus | Invoice["status"]

const LABELS: Record<PillStatus, string> = {
  active: "Active",
  paid: "Paid",
  completed: "Completed",
  scheduled: "Scheduled",
  unpaid: "Unpaid",
  unscheduled: "Not scheduled",
  overdue: "Past due",
  cancelled: "Cancelled",
  lapsed: "Lapsed",
}

const GOOD = "bg-positive/10 text-positive-deep border-positive/30"
const BOOKED = "bg-primary/10 text-primary-deep border-primary/30"
const WAITING = "bg-stone text-foreground border-border"
const BAD = "bg-destructive/10 text-destructive border-destructive/30"
const OVER = "bg-stone text-muted-foreground border-border"

const TONES: Record<PillStatus, string> = {
  active: GOOD,
  paid: GOOD,
  completed: GOOD,
  scheduled: BOOKED,
  unpaid: WAITING,
  unscheduled: WAITING,
  overdue: BAD,
  cancelled: OVER,
  lapsed: OVER,
}

/** The word shown for a status: "Past due" for overdue, "Not scheduled" for unscheduled, else the status in sentence case. */
export const statusLabel = (status: PillStatus): string => LABELS[status]

export interface StatusPillProps {
  status: PillStatus
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <Badge data-slot="status-pill" data-status={status} variant="outline" className={cn("whitespace-nowrap", TONES[status], className)}>
      {statusLabel(status)}
    </Badge>
  )
}
