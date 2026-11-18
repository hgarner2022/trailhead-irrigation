import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { PickDayButtons } from "../pass/_screens/PickDayButtons"
import type { ActionResult } from "../pass/_screens/CancelPassDialog"

// Change my day (or Pick a day) for one visit: the days the scheduler offers, one tap each, then "Moved to Tuesday, May 5. We texted you the new
// date." with the earlier day struck. It is the pass page's PickDayButtons given a visit instead of a pass kind. When no day is open inside the
// window it says so and gives the phone number. Server-safe: the buttons carry their own client boundary, so `onPick` goes through as the server action itself (an inline arrow cannot cross to a client component and is a 500).

export interface ChangeMyDayProps {
  visitId: string
  /** what the visit is, so a list of buttons reads "Change my day, Spring turn-on" to a screen reader */
  name?: string
  /** the day the visit has now, when it has one: the control is folded behind Change my day and the old day is shown as gone once another is taken */
  currentDay?: string | null
  /** the days on offer, up to three */
  days: string[]
  /** the server action: books the day and texts the customer */
  onPick?: (visitId: string, day: string) => ActionResult | Promise<ActionResult>
}

export function ChangeMyDay({ visitId, name, currentDay, days, onPick }: ChangeMyDayProps) {
  if (days.length === 0) {
    return (
      <p data-slot="no-open-days" className="text-base text-muted-foreground">
        {"No open days left in this window. Call Ryan at "}
        <a href={PHONE_TEL} className="font-semibold text-primary-deep underline underline-offset-2">
          {PHONE_DISPLAY}
        </a>
        .
      </p>
    )
  }
  return <PickDayButtons kind={visitId} days={days} onPick={onPick} {...(currentDay ? { foldedLabel: "Change my day", previousDay: currentDay, ...(name ? { foldedAria: `Change my day, ${name}` } : {}) } : {})} />
}
