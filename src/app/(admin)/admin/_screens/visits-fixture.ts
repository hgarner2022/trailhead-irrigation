/**
 * The catalog's data for the Visits page and the visit panel: the fixture snapshot with a handful of the office's
 * one-off visits added, one in each state a visit can be in. Used by the stories only; the tests build their own.
 */
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Client, Message, Visit } from "@/lib/admin/types"

export const VISITS_TODAY = "2026-11-12T19:56:30Z"
const base = snapshot as AdminData

const visit = (over: Partial<Visit>): Visit => ({
  id: "x", clientId: "c-dana", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "job-x",
  scheduledOn: "2026-11-19", startAt: "2026-11-19T15:00:00Z", price: 145, minutes: 120, truckId: "truck-1", truckName: "Truck 1", ...over,
})

export const oneOffs: Visit[] = [
  visit({ id: "office-scheduled", jobId: "job-a" }),
  visit({ id: "office-needs-day", jobId: "job-b", clientId: "c-sam", clientName: "Sam Ortiz", town: "Louisville", kind: "install", status: "unscheduled", scheduledOn: undefined, startAt: undefined, truckId: undefined, truckName: undefined, price: 0, minutes: 120 }),
  visit({ id: "office-not-done", jobId: "job-c", clientId: "c-lee", clientName: "Lee Park", kind: "repair", status: "unscheduled", scheduledOn: undefined, startAt: undefined, truckId: undefined, truckName: undefined, notDoneReason: "no-water" }),
  visit({ id: "office-unpaid", jobId: "job-d", clientId: "c-ana", clientName: "Ana Ruiz", town: "Lafayette", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" }),
  visit({ id: "office-paid", jobId: "job-e", clientId: "c-joe", clientName: "Joe Hart", town: "Longmont", status: "completed", completedOn: "2026-11-09", scheduledOn: "2026-11-09", startAt: "2026-11-09T15:00:00Z", chargedAt: "2026-11-09T22:00:00Z", paidMethod: "check" }),
  visit({ id: "office-day-passed", jobId: "job-f", clientId: "c-kim", clientName: "Kim Lowe", scheduledOn: "2026-11-09", startAt: "2026-11-09T15:00:00Z" }),
]

const people: Client[] = [
  { id: "c-dana", firstName: "Dana", lastName: "Reed", town: "Erie", address: "12 Elm St", phone: "+13035550111", email: "dana@example.com", jobberUrl: "", hasPass: false, app: true },
  { id: "c-sam", firstName: "Sam", lastName: "Ortiz", town: "Louisville", address: "9 Oak St", phone: "+13035550122", jobberUrl: "", hasPass: false, app: true },
  { id: "c-lee", firstName: "Lee", lastName: "Park", town: "Erie", address: "4 Pine Ct", phone: "+13035550133", jobberUrl: "", hasPass: false, app: true },
  { id: "c-ana", firstName: "Ana", lastName: "Ruiz", town: "Lafayette", address: "77 Cedar Ln", phone: "+13035550144", jobberUrl: "", hasPass: false, app: true },
  { id: "c-joe", firstName: "Joe", lastName: "Hart", town: "Longmont", address: "3 Birch Rd", jobberUrl: "", hasPass: false, app: true },
  { id: "c-kim", firstName: "Kim", lastName: "Lowe", town: "Erie", address: "21 Maple Ave", phone: "+13035550166", jobberUrl: "", hasPass: false, app: true },
]

const messages: Message[] = [
  { id: "m1", clientId: "c-dana", visitId: "office-scheduled", channel: "sms", kind: "date-set", body: "Trailhead: your repair is Thu, Nov 19. Calendar and changes: link Reply STOP to opt out.", at: "2026-11-11T16:00:00Z", status: "delivered" },
  { id: "m2", clientId: "c-dana", visitId: "office-scheduled", channel: "sms", kind: "note", body: "Trailhead: Ryan will call when he is ten minutes out. Reply STOP to opt out.", at: "2026-11-12T15:00:00Z", status: "sent" },
  { id: "m3", clientId: "c-joe", visitId: "office-paid", channel: "email", kind: "receipt", body: "Receipt: $145 for your repair", at: "2026-11-09T22:05:00Z", status: "delivered" },
]

/** The fixture's pass visits as visit rows (the snapshot keeps them on the passes, the live data on `visits`). */
const passVisits: Visit[] = base.passes
  .filter((p) => p.status !== "pending")
  .slice(0, 6)
  .flatMap((p) =>
    p.visits.map((pv): Visit => ({
      id: `${p.id}-${pv.kind}`, clientId: p.clientId, clientName: [p.firstName, p.lastName].filter(Boolean).join(" "), town: p.town, kind: pv.kind,
      status: p.status === "cancelled" ? "cancelled" : pv.completedAt ? "completed" : pv.scheduledOn ? "scheduled" : "unscheduled", isPass: true, passId: p.id, jobId: `job_${p.id}`, jobberUrl: "",
      ...(pv.scheduledOn ? { scheduledOn: pv.scheduledOn, startAt: pv.scheduledAt } : {}), ...(pv.completedAt ? { completedOn: pv.scheduledOn } : {}),
      ...(pv.chargedAt ? { chargedAt: pv.chargedAt, paidMethod: "card_on_file" } : {}), price: pv.amount, minutes: 120,
      ...(pv.scheduledOn ? { truckId: "truck-1", truckName: "Truck 1" } : {}),
    })),
  )

export const visitsData: AdminData = {
  ...base,
  visits: [...oneOffs, ...passVisits, ...base.visits],
  clients: [...people, ...base.clients],
  messages: [...messages, ...base.messages],
  attention: [],
}

/** A visit of an active pass that is booked and not yet done, for the panel's pass job block. */
export const passVisitId = passVisits.find((v) => v.status === "scheduled")?.id ?? passVisits[0]!.id
