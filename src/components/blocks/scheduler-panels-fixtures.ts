import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Person, Visit } from "@/lib/admin/types"
import type { NotToldVisit, Opening, PlanMove, UnscheduledJob } from "./scheduler-panels-types"

// Fixtures for the scheduler's side panels: the week of Monday, Nov 23 2026, Ryan Garner and Tech Two (the snapshot's two people), customers with
// first names and Erie, Lafayette and Longmont streets. The points are near each town's centre, so the map has something to draw.

export const PEOPLE: Person[] = (snapshot as AdminData).settings.people

/** A stop on the map: the Visit fields the map reads and no more. */
function stop(id: string, personId: string, clientName: string, town: Visit["town"], kind: Visit["kind"], day: string, lat: number, lng: number, stopOrder: number): Visit {
  return {
    id,
    clientId: `c-${id}`,
    clientName,
    town,
    kind,
    status: "scheduled",
    isPass: false,
    jobberUrl: "",
    personId,
    personName: PEOPLE.find((p) => p.id === personId)?.name,
    scheduledOn: day,
    startAt: `${day}T09:00:00-07:00`,
    stopOrder,
    lat,
    lng,
    minutes: 60,
  }
}

/** Tuesday, Nov 24: Ryan has three stops, Tech Two has two. */
export const STOPS: Visit[] = [
  stop("v-1", "person_truck-1", "Cassie Hart", "Erie", "turn-on", "2026-11-24", 40.0526, -105.0498, 1),
  stop("v-2", "person_truck-1", "Dana Reed", "Erie", "repair", "2026-11-24", 40.0461, -105.0412, 2),
  stop("v-3", "person_truck-1", "Percy Lund", "Lafayette", "blowout", "2026-11-24", 39.9944, -105.0871, 3),
  stop("v-4", "person_truck-2", "Maya Ortiz", "Longmont", "inspection", "2026-11-24", 40.1672, -105.1019, 1),
  stop("v-5", "person_truck-2", "Tom Weber", "Longmont", "blowout", "2026-11-24", 40.1561, -105.0933, 2),
]

export const UNSCHEDULED: UnscheduledJob[] = [
  { id: "u-1", customer: "Andrea Reyes", town: "Erie", service: "Spring turn-on", length: "1 h", addedOn: "2026-11-09", lat: 40.0508, lng: -105.0471 },
  { id: "u-2", customer: "Ben Alder", town: "Lafayette", service: "Repair", length: "1 h 30 min", addedOn: "2026-11-16", lat: 39.9987, lng: -105.0932 },
  { id: "u-3", customer: "Carla Voss", town: "Longmont", service: "Fall blowout", length: "45 min", addedOn: "2026-11-20", lat: 40.1704, lng: -105.1121 },
  { id: "u-4", customer: "Dev Patel", town: "Erie", service: "Mid-season inspection", length: "1 h", addedOn: "2026-11-23", lat: 40.0432, lng: -105.0554 },
]

export const NOT_TOLD: NotToldVisit[] = [
  { id: "n-1", customer: "Cassie Hart", town: "Erie", service: "Spring turn-on", was: "Mon, Nov 23, 9:00 am", now: "Tue, Nov 24, 9:00 am", phone: "(970) 555-0142", email: "cassie@example.com" },
  { id: "n-2", customer: "Dana Reed", town: "Erie", service: "Repair", was: "Tue, Nov 24, 1:00 pm", now: "Wed, Nov 25, 10:30 am", email: "dana@example.com" },
  { id: "n-3", customer: "Percy Lund", town: "Lafayette", service: "Fall blowout", was: "Wed, Nov 25, 8:00 am", now: "Thu, Nov 26, 8:00 am", phone: "(970) 555-0177" },
]

/** Openings for Andrea's turn-on: the least driving is not the soonest, which is the point of the three sorts. */
export const OPENINGS: Opening[] = [
  { id: "o-1", day: "2026-11-30", start: "09:00", end: "10:00", personId: "person_truck-1", personName: "Ryan Garner", addedMinutes: 30, score: 30 },
  { id: "o-2", day: "2026-12-01", start: "16:30", end: "17:30", personId: "person_truck-1", personName: "Ryan Garner", addedMinutes: 15, score: 21 },
  { id: "o-3", day: "2026-12-02", start: "13:00", end: "14:00", personId: "person_truck-1", personName: "Ryan Garner", addedMinutes: 3, score: 15, nextTo: "Next to a Longmont visit" },
  { id: "o-4", day: "2026-12-03", start: "14:30", end: "15:30", personId: "person_truck-2", personName: "Tech Two", addedMinutes: 15, score: 33, nextTo: "Next to an Erie visit" },
  { id: "o-5", day: "2026-12-04", start: "14:30", end: "15:30", personId: "person_truck-1", personName: "Ryan Garner", addedMinutes: 20, score: 44 },
]

/** Slots that break a rule, each with the engine's words (docs/plans/2026-11-18-scheduling-engine-design.md, section 6). */
export const FORCED: Opening[] = [
  { id: "f-1", day: "2026-11-30", start: "15:00", end: "16:00", personId: "person_truck-1", personName: "Ryan Garner", addedMinutes: 4, score: 10, conflict: "Ryan has Dry Creek Rd at 3:00 pm." },
  { id: "f-2", day: "2026-12-01", start: "12:00", end: "13:00", personId: "person_truck-1", personName: "Ryan Garner", addedMinutes: 6, score: 12, conflict: "Needs 15 minutes after Cheesman St; there are 5." },
  { id: "f-3", day: "2026-12-02", start: "17:00", end: "18:00", personId: "person_truck-2", personName: "Tech Two", addedMinutes: 8, score: 14, conflict: "Tech Two works until 5:00 pm." },
]

export const PLAN: PlanMove[] = [
  { id: "m-1", visit: "Dry Creek Rd", from: "Tue, Dec 1", to: "Thu, Dec 3, 9:30 am", reason: "Erie stops are together on Thursday.", kind: "move" },
  { id: "m-2", visit: "Cheesman St", from: "Wed, Dec 2", to: "Thu, Dec 3, 11:00 am", reason: "Same street as Dry Creek Rd.", kind: "move" },
  { id: "m-3", visit: "Ann Lee", from: "Wed, Dec 2", to: "Tue, Dec 1", reason: "Customer picked Wed. Needs your call.", kind: "customer-picked" },
  { id: "m-4", visit: "Briggs St", from: "Fri, Dec 4", to: "Thu, Dec 3, 1:00 pm", reason: "Saves 12 minutes of driving.", kind: "move" },
]

export const STALE_MOVE: PlanMove = { id: "m-5", visit: "Ash St", from: "Mon, Nov 30", to: "Tue, Dec 1, 10:00 am", reason: "Changed since", kind: "stale" }

/** Eleven moves, for the "11 visits moved" toast and the plan's full list. */
export const PLAN_ELEVEN: PlanMove[] = Array.from({ length: 11 }, (_, i) => ({
  id: `p-${i + 1}`,
  visit: ["Dry Creek Rd", "Cheesman St", "Briggs St", "Ash St", "Maple Ave", "Cedar Ct", "Pine St", "Holly Ln", "Birch Dr", "Elm St", "Oak Way"][i]!,
  from: "Tue, Dec 1",
  to: `Thu, Dec 3, ${9 + Math.floor(i / 2)}:${i % 2 ? "30" : "00"} am`,
  reason: i < 6 ? "Erie stops are together on Thursday." : "Longmont stops are together on Wednesday.",
  kind: "move",
}))
