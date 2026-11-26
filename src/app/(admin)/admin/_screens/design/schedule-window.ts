import { customerChangeLine } from "../visit-panel-model"
import { shortDay } from "@/lib/admin/format"

// The customer's 24-hour window on the Schedule (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 8): the product's own `customerChangeLine` (the visit panel's line, `withinCutoff`) for the
// day a visit is on and the day it is going to, said only when that day is inside the window ("Closed, texts only"): the customer can no longer change it online, so a move there is the one that
// most needs a message. Pure; `today` is a day "YYYY-MM-DD".

const CLOSED = "Closed, texts only"

/** "Wed, Nov 25: Closed, texts only" for each of the days that is inside the window; none when neither is. */
export function windowLines(today: string, days: { old?: string | null; next?: string | null }): string[] {
  const out: string[] = []
  for (const day of [...new Set([days.old, days.next])]) {
    if (!day) continue
    if (customerChangeLine({ scheduledOn: day, startAt: undefined }, true, today) === CLOSED) out.push(`${shortDay(day)}: ${CLOSED}`)
  }
  return out
}
