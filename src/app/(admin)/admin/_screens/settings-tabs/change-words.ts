import type { SettingsChange } from "@/lib/admin/types"
import { LINE_NAMES } from "@/lib/jobs/lines"
import { monthDayOfDate, monthDayWords } from "@/lib/services-window"

/**
 * The change log's words. The reducers write their lines in the screen's own words, but a line the API logged from `settings.update` keeps
 * the key it changed ("windows.blowout.opensOn" from "2027-10-01" to "2027-10-05"). `changeWords` words a known key the way the Services
 * tab names it ("Fall blowout first bookable day from Oct 1 to Oct 5") and gives any other raw key plain words ("Billing due days"); a line
 * already in words passes through. `pendingLines` is what the SaveBar lists for the edits Save has not written yet.
 */

const KEY = /^[a-z][A-Za-z]*(\.[A-Za-z][A-Za-z0-9-]*)+$/
const sentence = (words: string) => words.charAt(0).toUpperCase() + words.slice(1)
/** "dueDays" is "due days", "turn-on" stays "turn-on". */
const spaced = (part: string) => part.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
/** "Oct 1" from "2027-10-01"; anything else as it is. */
const dayWords = (v: string) => {
  const md = monthDayOfDate(v)
  return md ? monthDayWords(md) : v
}

const WINDOW_LEAF: Record<string, string> = { opensOn: "first bookable day", closesOn: "last bookable day", leadWeeks: "lead time" }

export function changeWords(c: SettingsChange): SettingsChange {
  if (!KEY.test(c.field)) return c
  const parts = c.field.split(".")
  const window = parts[0] === "windows" && parts.length === 3 ? WINDOW_LEAF[parts[2]!] : undefined
  if (window) {
    const name = LINE_NAMES[parts[1] as keyof typeof LINE_NAMES] ?? sentence(spaced(parts[1]!))
    return { ...c, field: `${name} ${window}`, from: dayWords(c.from), to: dayWords(c.to) }
  }
  return { ...c, field: sentence(parts.map(spaced).join(" ")), from: dayWords(c.from), to: dayWords(c.to) }
}

/** "Ryan Garner most repairs per day from 4 to 5": one line per field edited, from what it was at Save to what it is now. */
export function pendingLines(changes: SettingsChange[]): string[] {
  const byField = new Map<string, { from: string; to: string }>()
  for (const raw of changes) {
    const c = changeWords(raw)
    const seen = byField.get(c.field)
    byField.set(c.field, { from: seen ? seen.from : c.from, to: c.to })
  }
  return [...byField].filter(([, v]) => v.from !== v.to).map(([field, v]) => `${field} from ${v.from} to ${v.to}`)
}
