import { formatMoney } from "@/lib/admin/metrics"
import { preferenceOf, preferencePhrase } from "@/lib/admin/format"
import type { Pass, PassVisit } from "@/lib/admin/types"

/** One line of "What happens next": when it happens (the lead, in the display face) and what to expect, in a plain sentence. */
export interface NextLine {
  key: string
  lead: string
  text: string
}

const NAME = { "turn-on": "spring turn-on", inspection: "mid-season inspection", blowout: "fall blowout" } as const
const TEXT_AHEAD = "We text you the day two weeks before."

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/** The lead for a visit: its month, with the customer's preference where the visit asked one ("Mid October"); the inspection is just July. */
function leadOf(pass: Pass, visit: PassVisit): string {
  const preference = preferenceOf(pass, visit.kind)
  return visit.kind === "inspection" || preference === null ? visit.window : capital(preferencePhrase(visit.kind, preference))
}

/**
 * What the pass the customer holds promises, from the visits on it (a visit past its window is not on the pass, so it is not here):
 * each visit in its window with the text-ahead promise, then what is charged and when, with the amounts the pass holds.
 */
export function nextLines(pass: Pass): NextLine[] {
  const visits = pass.visits.filter((v) => v.kind === "turn-on" || v.kind === "inspection" || v.kind === "blowout")
  const lines: NextLine[] = visits.map((v) => ({ key: v.kind, lead: leadOf(pass, v), text: `${capital(NAME[v.kind])}. ${TEXT_AHEAD}` }))
  const charges = visits.map((v) => `${formatMoney(v.amount)} after the ${NAME[v.kind]}`).join(", then ")
  if (visits.length > 0) lines.push({ key: "charge", lead: "After each visit", text: `Nothing is charged until each visit is done: ${charges}.` })
  return lines
}
