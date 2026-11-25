import { addDays, weekDays, weekdayOf, WEEKDAYS } from "@/lib/admin/calendar"
import type { Person, Town, Visit, VisitKind } from "@/lib/admin/types"
import { monthWeeks, type MonthDay } from "./month-grid-model"
import { blockOf, type GridBlock, type TimeOff } from "./time-grid-model"
import type { GridColumn } from "./time-grid-types"

// The calendar's fixtures: Ryan Garner and Tech Two, the week of Monday Nov 23 2026 (today is Wednesday the 25th, 10:20 am) and the month of
// November. Real `Visit` and `Person` shapes; first names and street addresses only. The week holds a full Tuesday in Erie, an overlap that is a
// conflict (Thursday), a 30 minute blowout beside a 2 hour repair, three Any time visits, Ryan off Wednesday 12 to 2, Tech Two off all Thursday,
// two visits the customer has not been told about, one Waiting on customer and done visits on Monday.

export const RYAN = "person_truck-1"
export const TECH = "person_truck-2"
const week = ["mon", "tue", "wed", "thu", "fri"] as const
export const PEOPLE: Person[] = [
  { id: RYAN, name: "Ryan Garner", initials: "RG", role: "owner", truck: "Truck 1", workingDays: [...week], capacityByKind: { "turn-on": 6, inspection: 6, blowout: 10, repair: 4, other: 4 }, hoursStart: "08:00", hoursEnd: "17:00" },
  { id: TECH, name: "Tech Two", initials: "TT", role: "tech", truck: "Truck 2", workingDays: [...week], capacityByKind: { "turn-on": 5, inspection: 5, blowout: 8, repair: 3, other: 3 }, hoursStart: "09:00", hoursEnd: "16:00" },
]

export const WEEK_START = "2026-11-23"
export const TODAY = "2026-11-25"
export const NOW = { day: TODAY, minutes: 10 * 60 + 20 }
const DAYS = weekDays(WEEK_START)
const [MON, TUE, WED, THU, FRI] = DAYS as [string, string, string, string, string, string, string]

export const dayColumns = (days: readonly string[] = DAYS, counts: Record<string, number> = {}): GridColumn[] =>
  days.map((day) => {
    const n = counts[day]
    return { day, label: `${Number(day.slice(8))} ${weekdayOf(day).replace(/^./, (c) => c.toUpperCase())}`, today: day === TODAY, count: n === undefined ? undefined : `${n} ${n === 1 ? "visit" : "visits"}` }
  })

type Row = { id: string; day: string; who: string; at: string | null; min: number; kind: VisitKind; street: string; name: string; town: Town; done?: boolean; notTold?: boolean; waiting?: boolean }
const R = (id: string, day: string, who: string, at: string | null, min: number, kind: VisitKind, street: string, name: string, town: Town = "Erie", more: Partial<Row> = {}): Row => ({ id, day, who, at, min, kind, street, name, town, ...more })

const ROWS: Row[] = [
  R("v1", MON, RYAN, "09:00", 60, "turn-on", "Briggs St", "Andrea", "Erie", { done: true }),
  R("v2", MON, RYAN, "10:30", 120, "repair", "Moffat Ave", "Marcus", "Louisville", { done: true }),
  R("v3", MON, TECH, "09:30", 30, "blowout", "Main St", "Dale", "Lafayette", { done: true }),
  R("v4", TUE, RYAN, "08:00", 60, "turn-on", "Cheesman St", "Priya"),
  R("v5", TUE, RYAN, "09:15", 60, "turn-on", "Dry Creek Rd", "Hal", "Erie", { notTold: true }),
  R("v6", TUE, RYAN, "10:30", 90, "inspection", "Briggs St", "Ivy"),
  R("v7", TUE, RYAN, "12:00", 120, "repair", "Vista Pkwy", "Gus"),
  R("v8", TUE, RYAN, "14:30", 60, "turn-on", "Telleen Ave", "Rosa"),
  R("v9", TUE, RYAN, "15:45", 60, "turn-on", "Bonanza Dr", "Beth"),
  R("v10", TUE, TECH, "09:00", 60, "turn-on", "Meadowlark Ln", "Sam"),
  R("v11", TUE, TECH, "10:30", 60, "turn-on", "Kenosha Dr", "Nina"),
  R("v12", TUE, TECH, "12:00", 30, "blowout", "Evans St", "Theo"),
  R("v13", TUE, TECH, "13:00", 90, "inspection", "Sunset Dr", "Lena"),
  R("v14", TUE, TECH, "14:45", 60, "turn-on", "Powers Ct", "Omar"),
  R("v15", WED, RYAN, "09:00", 120, "repair", "Spruce Ct", "Jan", "Erie"),
  R("v16", WED, TECH, "09:00", 30, "blowout", "Lark Bunting Dr", "Pete", "Erie"),
  R("v17", WED, TECH, "11:00", 60, "turn-on", "Poplar St", "Cora", "Lafayette", { waiting: true }),
  R("v18", WED, RYAN, "14:30", 60, "turn-on", "Telleen Ave", "Wes", "Erie", { notTold: true }),
  R("v19", THU, RYAN, "14:00", 60, "turn-on", "Dry Creek Rd", "Hal"),
  R("v20", THU, RYAN, "14:30", 60, "inspection", "Cheesman St", "Priya"),
  R("v21", THU, RYAN, "09:00", 60, "turn-on", "Zuni Way", "Faye", "Firestone"),
  R("v22", FRI, RYAN, "08:30", 60, "turn-on", "Rock Creek Cir", "Dina", "Broomfield"),
  R("v23", FRI, RYAN, "10:00", 60, "inspection", "Aspen Ct", "Kit", "Broomfield"),
  R("v24", FRI, TECH, "09:00", 90, "inspection", "Maple St", "Joel", "Longmont"),
  // Any time: a day and no start
  R("a1", TUE, RYAN, null, 60, "turn-on", "Larkspur Dr", "Mia"),
  R("a2", WED, TECH, null, 60, "turn-on", "Ash Ct", "Ben", "Lafayette"),
  R("a3", FRI, RYAN, null, 90, "inspection", "Willow Ln", "Ada", "Broomfield"),
]

const visitOf = (r: Row): Visit => ({
  id: r.id, clientId: `client_${r.id}`, clientName: `${r.name} Reyes`, town: r.town, kind: r.kind, status: r.done ? "completed" : "scheduled", isPass: r.kind !== "repair",
  jobberUrl: "", scheduledOn: r.day, startTime: r.at ?? undefined, personId: r.who, minutes: r.min, waiting: r.waiting,
})
const blocksOf = (rows: Row[]): GridBlock[] => rows.flatMap((r) => { const b = blockOf(visitOf(r), { title: r.street, notTold: r.notTold }); return b ? [b] : [] })

/** Every visit of the week with a time. */
export const WEEK_BLOCKS: GridBlock[] = blocksOf(ROWS.filter((r) => r.at))
/** The three Any time visits. */
export const WEEK_ANYTIME: GridBlock[] = blocksOf(ROWS.filter((r) => !r.at))
export const WEEK_VISITS: Visit[] = ROWS.map(visitOf)

export const WEEK_OFF: TimeOff[] = [
  { id: "off1", personId: RYAN, day: WED, start: 12 * 60, end: 14 * 60 },
  { id: "off2", personId: TECH, day: THU, start: null, end: null },
]

export const WEEK_COUNTS: Record<string, number> = Object.fromEntries(DAYS.map((d) => [d, ROWS.filter((r) => r.day === d).length]))
export const WEEK_COLUMNS: GridColumn[] = dayColumns(DAYS, WEEK_COUNTS)
export const DAY_COLUMNS: GridColumn[] = dayColumns([WED], { [WED]: WEEK_COUNTS[WED] ?? 0 }).map((c) => ({ ...c, caption: "4 stops, 5 h open" }))

/** A conflict on Thursday: Ryan's 2:00 and 2:30 overlap (found by the rules). */
export const CONFLICT_BLOCKS = WEEK_BLOCKS.filter((b) => b.day === THU)
/** Dotted proposals: Briggs St from Tuesday 10:30 to Thursday 10:00, and Moffat Ave from Monday to Wednesday 3:00 pm for Tech Two. */
export const PLANNED: GridBlock[] = [
  { ...WEEK_BLOCKS.find((b) => b.id === "v6")!, id: "p1", day: THU, start: 10 * 60, planned: { day: TUE, personId: RYAN, start: 10 * 60 + 30 } },
  { ...WEEK_BLOCKS.find((b) => b.id === "v2")!, id: "p2", day: WED, personId: TECH, start: 15 * 60, minutes: 60, planned: { day: MON, personId: RYAN, start: 10 * 60 + 30 }, done: false },
]
export const WEEK_EMPTY: GridColumn[] = dayColumns(DAYS.map((d) => addDays(d, 7)))

/** The month of November 2026: the week above is real; the other weeks follow a fixed pattern so the stories never drift. */
export function monthFixture(): MonthDay[] {
  const real = new Map(DAYS.map((day) => {
    const rows = ROWS.filter((r) => r.day === day)
    const towns = [...rows.reduce((m, r) => m.set(r.town, (m.get(r.town) ?? 0) + 1), new Map<Town, number>())].sort((a, b) => b[1] - a[1]).map(([t]) => t)
    const off = WEEK_OFF.filter((o) => o.day === day)
    return [day, { day, stops: rows.length, towns, personIds: [...new Set(rows.map((r) => r.who))], offIds: off.map((o) => o.personId), allOff: false, notTold: rows.some((r) => r.notTold) } satisfies MonthDay]
  }))
  const cycle: Town[][] = [["Erie"], ["Lafayette", "Louisville"], ["Longmont", "Erie", "Firestone"], ["Broomfield"], ["Erie", "Lafayette"]]
  const out: MonthDay[] = []
  monthWeeks("2026-11").flat().forEach((day, i) => {
    if (!day) return
    const wd = WEEKDAYS.indexOf(weekdayOf(day))
    const r = real.get(day)
    if (r) out.push(r)
    else if (wd < 5 && day < TODAY) out.push({ day, stops: 3 + ((i * 3) % 5), towns: cycle[i % cycle.length] ?? [], personIds: [RYAN, TECH] })
    else if (wd < 5 && day > FRI) out.push({ day, stops: (i * 2) % 4, towns: cycle[(i + 1) % cycle.length] ?? [], personIds: i % 3 ? [RYAN] : [RYAN, TECH], notTold: day === "2026-11-30" })
  })
  return out
}
export const MONTH_OFF: MonthDay[] = monthFixture().map((d) => (d.day === "2026-11-27" ? { ...d, allOff: true, stops: 0, towns: [], personIds: [], offIds: [RYAN, TECH] } : d))
