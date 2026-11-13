/**
 * The crew's morning note, pure: what tomorrow holds, which truck is where, what moved in Jobber this week and what yesterday
 * left unmarked. Plain sentences; a part with nothing to say is left out.
 */
export interface CrewVisit {
  truckName: string
  town: string
}

export interface CrewSummaryInput {
  tomorrow: CrewVisit[]
  /** visits Ryan or the crew moved in Jobber this week */
  movedInJobber: number
  /** visits from yesterday nobody marked done */
  notMarkedDone: number
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "Erie", "Erie and Firestone", "Erie, Firestone and Longmont". */
export const listWords = (items: string[]): string => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`)

/** "Tomorrow: 12 visits, Truck 1 in Erie and Firestone (7), Truck 2 in Longmont (5). 3 moved in Jobber this week. 2 visits from yesterday not marked done." */
export function crewSummary(input: CrewSummaryInput): string {
  const parts: string[] = []
  if (input.tomorrow.length === 0) parts.push("Tomorrow: nothing on the calendar.")
  else {
    const byTruck = new Map<string, CrewVisit[]>()
    for (const v of input.tomorrow) byTruck.set(v.truckName, [...(byTruck.get(v.truckName) ?? []), v])
    const trucks = [...byTruck.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, visits]) => `${name} in ${listWords([...new Set(visits.map((v) => v.town))].sort())} (${visits.length})`)
    parts.push(`Tomorrow: ${plural(input.tomorrow.length, "visit")}, ${trucks.join(", ")}.`)
  }
  if (input.movedInJobber > 0) parts.push(`${input.movedInJobber} moved in Jobber this week.`)
  if (input.notMarkedDone > 0) parts.push(`${plural(input.notMarkedDone, "visit")} from yesterday not marked done.`)
  return parts.join(" ")
}

/** "8 to 10 am" for a visit that starts at 08:00: the two-hour window the day-before text gives. */
export function twoHourWindow(startTime: string): string {
  const hour = Number(startTime.slice(0, 2))
  const end = hour + 2
  const word = (h: number) => `${h % 12 === 0 ? 12 : h % 12}`
  const ampm = (h: number) => (h >= 12 ? "pm" : "am")
  return ampm(hour) === ampm(end) ? `${word(hour)} to ${word(end)} ${ampm(end)}` : `${word(hour)} ${ampm(hour)} to ${word(end)} ${ampm(end)}`
}
