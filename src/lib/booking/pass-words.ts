// The words for a Season Pass visit that has a preference and no day yet, one place for the booking form, the confirmation card, the account and the job page (Hannah, Nov 20 2026). The only
// statements are the two she allowed: "We'll schedule it about two weeks before and tell you the day." and the preference words (Early, Mid or Late, with the month, from `preferenceLabel`).
// Nothing here is terms.
import type { TimingPreference } from "@/lib/admin/types"
import { preferenceLabel } from "@/lib/admin/format"
import type { PassVisitKind } from "@/lib/booking/pass-visits"

export const SCHEDULE_NOTE = "We'll schedule it about two weeks before and tell you the day."

/** "Preference: Early October" */
export const preferenceStatement = (kind: PassVisitKind, preference: TimingPreference) => `Preference: ${preferenceLabel(kind, preference)}`

/** "Preference: Early October. We'll schedule it about two weeks before and tell you the day." */
export const preferenceFull = (kind: PassVisitKind, preference: TimingPreference) => `${preferenceStatement(kind, preference)}. ${SCHEDULE_NOTE}`

/** The same sentence for a step that holds two visits. */
export const SCHEDULE_NOTE_EACH = "We'll schedule each about two weeks before and tell you the day."

/** How an exact visit gets its day, and how a preference visit gets it, as the pass card and the confirm step say it. */
export const HOW_EXACT = "You pick the day and time now."
export const HOW_PREFERENCE = `You pick Early, Mid or Late. ${SCHEDULE_NOTE}`
export const CHARGED_AFTER = "Charged after the visit."

/**
 * What the pass is, in its customer's terms (Hannah, Nov 21 2026: the renewal is a convenience, not a duty). The first line is a fact of the pass (we schedule every season's visits so the customer
 * never has to remember), the second is the account's cancel, the third is her Nov 20 decision that a visit is paid for after it is done. The legal wording of the renewal is not here: it goes in the
 * terms the customer accepts on the contact step, and Hannah owes it (docs/plans/2026-11-19-booking-form-design.md, "Needs Hannah").
 */
export const PASS_SCHEDULES = "We schedule your visits every season, so you never have to remember."
export const PASS_LINES: readonly string[] = [PASS_SCHEDULES, "You can cancel in your Trailhead account.", "You pay for each visit after it's done."]

/** A preference is kept for every season (Hannah, Nov 21 2026), so a renewal schedules the visit without asking again, and the customer changes it in their account. */
export const PREFERENCE_KEPT = "We use it every season. You can change it in your Trailhead account."

/**
 * The pass is automation: what the customer gets without doing anything. Every line is a message kind or a rule that exists (docs/plans/2026-11-20-customer-messages-inventory.md: two weeks out and day before
 * texts, on my way, the receipt, the renewal), with no time or promise beyond them, and nothing the customer must do.
 */
export const HAPPENS_FOR_YOU = "What happens for you"
export const PASS_HAPPENS: readonly string[] = [
  "Visits with no day yet are scheduled about two weeks before, and we tell you the day.",
  "We confirm it two weeks before and remind you the day before.",
  "We text you when Ryan is on the way.",
  "We email a receipt after each visit.",
  "We remind you before the pass renews.",
]

/** Said once where it matters, on the card step and on the confirm step (Hannah, Nov 21 2026: "it's about getting them set up"). */
export const NOTHING_CHARGED = "Nothing is charged now. You pay after each visit."
export const CARD_FOR_PASS = "Nothing is charged now. Your card is charged after each visit."
