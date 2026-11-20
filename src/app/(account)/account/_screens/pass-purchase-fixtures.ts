// Season Passes as a customer sees them right after buying on a date (docs/plans/2026-11-20-season-pass-booking-research.md): the April buyer has the spring turn-on booked at an exact day and time and the
// fall blowout with only a preference; the January buyer has two preferences and no day. Visit ids match `passJob` (v1, v2) so the same stories read the visit's exact time from `times`.
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import type { BookedTimes } from "@/lib/portal/booked-time"

const base = snapshot.passes[0] as Pass
const NO_DAY = { payments: undefined, scheduledAt: undefined, scheduledOn: undefined, completedAt: undefined }

/** April 14 2027: the turn-on is Wednesday, April 28 at 10:30 am; the blowout is "Preference: Early October". The July inspection is not on the pass. */
export const aprilPass: Pass = {
  ...base,
  zones: 8,
  turnOnPreference: "recommended",
  blowoutPreference: "earlier",
  visits: [
    { ...base.visits[0]!, ...NO_DAY, id: "v1", window: "May", scheduledAt: "2027-04-28T16:30:00Z", scheduledOn: "2027-04-28", startTime: "10:30", amount: 165 },
    { ...base.visits[2]!, ...NO_DAY, id: "v2", amount: 115 },
  ],
}
export const aprilTimes: BookedTimes = { v1: "10:30" }

/** January 12 2027: two preferences, no day for either. */
export const januaryPass: Pass = {
  ...aprilPass,
  turnOnPreference: "earlier",
  blowoutPreference: "later",
  visits: [
    { ...aprilPass.visits[0]!, scheduledAt: undefined, scheduledOn: undefined, startTime: undefined },
    aprilPass.visits[1]!,
  ],
}
