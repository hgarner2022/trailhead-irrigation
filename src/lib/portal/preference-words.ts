// The customer's words for a timing preference, in one place for the account's three doors to it (Details › Preferences, the Season Pass tab, and the quiet banner on Home and the
// Season Pass tab when we ask), and for the "Preference request" message (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)").
//
// Hannah, Nov 22 2026: "what they prefer for spring turn-ons: our recommended, mid season, late season". The data model has three values (`TimingPreference`: earlier,
// recommended, later) and the date words already call the middle one "Mid" (`preferenceLabel`: Early, Mid, Late with the month). There is no fourth value, so "Our recommended"
// IS the middle of the window: the same value, named for what it is to the customer, with the month under it ("Mid May"). Early and late are "Early season" and "Late season".
// The only sentence about scheduling is the one Hannah allowed (`SCHEDULE_NOTE`); nothing here is a promise she did not make.
import type { TimingPreference } from "@/lib/admin/types"
import { TIMING_PREFERENCES, preferenceLabel } from "@/lib/admin/format"
import { SCHEDULE_NOTE } from "@/lib/booking/pass-words"

export type TimingKind = "turn-on" | "blowout"

/** The visits a customer states a timing for, in the order of the season. */
export const TIMING_KINDS: readonly TimingKind[] = ["turn-on", "blowout"]

export const TIMING_NAME: Record<TimingKind, string> = { "turn-on": "spring turn-on", blowout: "fall blowout" }
export const TIMING_TITLE: Record<TimingKind, string> = { "turn-on": "Spring turn-on", blowout: "Fall blowout" }

/** The three choices, in calendar order. The value in the data is the key. */
export const TIMING_CHOICES: readonly TimingPreference[] = TIMING_PREFERENCES
export const TIMING_LABEL: Record<TimingPreference, string> = { earlier: "Early season", recommended: "Our recommended", later: "Late season" }

/** "Mid May": the dates behind a choice. */
export const timingMonth = (kind: TimingKind, preference: TimingPreference) => preferenceLabel(kind, preference)

/** "Our recommended, mid May": a saved choice in one line. */
export const timingLine = (kind: TimingKind, preference: TimingPreference) => {
  const month = timingMonth(kind, preference)
  return `${TIMING_LABEL[preference]}, ${month.charAt(0).toLowerCase()}${month.slice(1)}`
}

/** What is asked, as a heading: "When would you like your fall blowout?" */
export const timingQuestion = (kind: TimingKind) => `When would you like your ${TIMING_NAME[kind]}?`

/** The one sentence that says what happens next, Hannah's: we schedule it about two weeks before and tell the day. */
export const TIMING_NEXT = SCHEDULE_NOTE

/** The preference kept for every season: where it is changed. */
export const TIMING_KEPT = "We use your choice every season."
