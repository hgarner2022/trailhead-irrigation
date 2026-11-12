import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Invoice, PassStatus, VisitStatus } from "@/lib/admin/types"

// One chip for every status word in the app, coloured by what the status
// means for the business (docs/DESIGN.md, Copy): good outcomes green, a
// booked visit orange, past due warning, and the quiet states grey. The
// label is the plain word in sentence case. Pure render, server component.
//
// The coloured pills sit on an opaque white fill, not a tint: at 12px the
// positive and warning inks reach 5.0:1 on white but only 4.2 to 4.4 on a 10%
// tint over cream or white, under the 4.5 axe demands. A tint needs darker
// ink tokens first.

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

const GOOD = "bg-background text-positive border-positive/30"
const BOOKED = "bg-background text-primary-dark border-primary/30"
const WAITING = "bg-stone text-foreground border-border"
const BAD = "bg-background text-warning border-warning/30"
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
