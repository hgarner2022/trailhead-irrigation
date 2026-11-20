// The words for a Season Pass visit that has a preference and no day yet, one place for the booking form, the confirmation card, the account and the job page (Hannah, Nov 20 2026). The only
// statements are the two she allowed: "We'll schedule it about two weeks before and tell you the day." and the preference words (Early, Mid or Late, with the month, from `preferenceLabel`).
// The agreement is a placeholder until Hannah writes it; nothing here is terms.
import type { TimingPreference } from "@/lib/admin/types"
import { preferenceLabel } from "@/lib/admin/format"
import type { PassVisitKind } from "@/lib/booking/pass-visits"

export const SCHEDULE_NOTE = "We'll schedule it about two weeks before and tell you the day."

/** "Preference: Early October" */
export const preferenceStatement = (kind: PassVisitKind, preference: TimingPreference) => `Preference: ${preferenceLabel(kind, preference)}`

/** "Preference: Early October. We'll schedule it about two weeks before and tell you the day." */
export const preferenceFull = (kind: PassVisitKind, preference: TimingPreference) => `${preferenceStatement(kind, preference)}. ${SCHEDULE_NOTE}`

/** The pass's agreement, to be written by Hannah: shown as a marked placeholder, never as terms. */
export const AGREEMENT_PLACEHOLDER = "[Wording from Hannah]"

/** The renewal choice, stated as facts (Hannah's decisions): it renews each season until the customer cancels, a reminder comes before each renewal, the customer cancels in the account, and pays only for each visit done. */
export const RENEWAL_FACTS: readonly { label: string; value: string }[] = [
  { label: "Renews", value: "Auto-renews each season until you cancel." },
  { label: "Reminder", value: "Before each renewal." },
  { label: "Cancel", value: "In your Trailhead account." },
  { label: "You pay", value: "For each visit done, after the visit." },
]
