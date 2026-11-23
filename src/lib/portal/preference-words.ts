// The customer's words for a timing preference, in one place for the account's three doors to it (Details › Preferences, the Season Pass tab, and the quiet banner on Home and the
// Season Pass tab when we ask), and for the "Preference request" message (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)").
//
// Hannah, Nov 22 2026: "what they prefer for spring turn-ons: our recommended, mid season, late season". The data model has three values (`TimingPreference`: earlier,
// recommended, later) and the date words already call the middle one "Mid" (`preferenceLabel`: Early, Mid, Late with the month). There is no fourth value, so "Our recommended"
// IS the middle of the window: the same value, named for what it is to the customer, with the month under it ("Mid May"). Early and late are "Early season" and "Late season".
// The only sentence about scheduling is the one Hannah allowed (`SCHEDULE_NOTE`); nothing here is a promise she did not make.
import type { TimingPreference } from "@/lib/admin/types"
import { TIMING_PREFERENCES } from "@/lib/admin/format"
import { SCHEDULE_NOTE } from "@/lib/booking/pass-words"
import { WINDOWS, preferenceDates, rangeWords } from "@/lib/booking/pass-visits"

export type TimingKind = "turn-on" | "blowout"

/** The visits a customer states a timing for, in the order of the season. */
export const TIMING_KINDS: readonly TimingKind[] = ["turn-on", "blowout"]

export const TIMING_NAME: Record<TimingKind, string> = { "turn-on": "spring turn-on", blowout: "fall blowout" }
export const TIMING_TITLE: Record<TimingKind, string> = { "turn-on": "Spring turn-on", blowout: "Fall blowout" }

/** The three choices, in calendar order. The value in the data is the key. */
export const TIMING_CHOICES: readonly TimingPreference[] = TIMING_PREFERENCES
export const TIMING_LABEL: Record<TimingPreference, string> = { earlier: "Early season", recommended: "Our recommended", later: "Late season" }

/**
 * "May 1 to May 15": the real days behind a choice, from the window source (`WINDOWS`, which reads `defaultWindows`; the turn-on's recommended days are early to mid May, the other
 * choices are the days before and after). The blowout's ranges are placeholders until Hannah confirms the blowout window. The ranges repeat every year, so the year is a stand-in.
 */
export const timingMonth = (kind: TimingKind, preference: TimingPreference) => rangeWords(preferenceDates({ kind, opens: `2001-${WINDOWS[kind].opens}`, closes: `2001-${WINDOWS[kind].closes}` })[preference])

/** "Our recommended, May 1 to May 15": a saved choice in one line. */
export const timingLine = (kind: TimingKind, preference: TimingPreference) => `${TIMING_LABEL[preference]}, ${timingMonth(kind, preference)}`

/**
 * What a visit with no day reads (Hannah, Nov 22 2026: a visit months away takes only a preference, and we schedule it about two weeks before and tell the customer). A Season Pass visit
 * reads its preference with the real days and the one sentence she allowed; any other waiting visit says it is not scheduled and that we will text when it is. Never a prompt to pick a day.
 */
export function waitingDay(kind: string, preference: TimingPreference | null | undefined): { heading: string; detail: string } {
  if (preference && (kind === "turn-on" || kind === "blowout")) return { heading: timingLine(kind, preference), detail: SCHEDULE_NOTE }
  return { heading: "Not scheduled yet", detail: "We'll text you when Ryan has one." }
}

/** What is asked, as a heading: "When would you like your fall blowout?" */
export const timingQuestion = (kind: TimingKind) => `When would you like your ${TIMING_NAME[kind]}?`

/** The one sentence that says what happens next, Hannah's: we schedule it about two weeks before and tell the day. */
export const TIMING_NEXT = SCHEDULE_NOTE

/** The preference kept for every season: where it is changed. */
export const TIMING_KEPT = "We use your choice every season."
