// The words for a Season Pass visit that has a preference and no day yet, one place for the booking form, the confirmation card, the account and the job page (Hannah, Nov 20 2026). The only
// statements are the two she allowed: "We'll schedule it about two weeks before and tell you the day." and the preference words (Early, Mid or Late, with the month, from `preferenceLabel`).
// Nothing here is terms.
import type { TimingPreference } from "@/lib/admin/types"
import { preferenceLabel } from "@/lib/admin/format"
import type { PassVisitKind } from "@/lib/booking/pass-visits"

export const SCHEDULE_NOTE = "We'll schedule it about two weeks before and tell you the day."

/** "Preference: Early October" */
export const preferenceStatement = (kind: PassVisitKind, preference: TimingPreference) => `Preference: ${preferenceLabel(kind, preference)}`

/** The same sentence for a step that holds two visits. */
export const SCHEDULE_NOTE_EACH = "We'll schedule each about two weeks before and tell you the day."

/**
 * What the pass is, in its customer's terms (Hannah, Nov 21 2026: the renewal is a convenience, not a duty). The first line is a fact of the pass (we schedule every season's visits so the customer
 * never has to remember), the second is the account's cancel, the third is her Nov 20 decision that a visit is paid for after it is done. The legal wording of the renewal is not here: it goes in the
 * terms the customer accepts on the contact step, and Hannah owes it (docs/plans/2026-11-19-booking-form-design.md, "Needs Hannah").
 */
export const PASS_SCHEDULES = "We schedule your visits every season, so you never have to remember."
export const PASS_LINES: readonly string[] = [PASS_SCHEDULES, "You can cancel in your Trailhead account.", "You pay for each visit after it's done."]

/** Said where the card is kept (Hannah, Nov 22 2026: one line, once): when the saved card is charged, which is how the saved card is used. */
export const CARD_FOR_PASS = "Charged after each visit."
