/**
 * The catalog's data for the Visits page and the visit panel: the fixture snapshot with a handful of the office's
 * one-off visits added, one in each state a visit can be in. Used by the stories only; the tests build their own.
 */
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import { lineForVisitKind } from "@/lib/jobs/lines"
import { stageOf } from "@/lib/jobs/stage"
import { jobMoney } from "@/lib/money/words"
import type { AdminData, AdminInvoice, Client, JobLine, Message, Pass, SoldJob, Visit, Yard } from "@/lib/admin/types"

export const VISITS_TODAY = "2026-11-12T19:56:30Z"
const base = snapshot as AdminData

const visit = (over: Partial<Visit>): Visit => ({
  id: "x", clientId: "c-dana", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "job-x",
  scheduledOn: "2026-11-19", startAt: "2026-11-19T15:00:00Z", price: 145, minutes: 120, personId: "person_truck-1", personName: "Ryan Garner", ...over,
})

/** What Dana's property holds: the lines the visit panel's "At the property" block reads. */
export const YARD: Yard = {
  zones: 8, controller: "Rachio 3 in the garage", backflowLocation: "north side of the house", gateCode: "4471", mustBeHome: false, accessNote: "Dog loose, close the gate",
  contactName: "Dana", contactPhone: "+13035550111", notes: "Clay soil by the fence",
}

/** The bill the office sent Ben for his repair: due two weeks after it went out, with the customer's pay link. */
export const BEN_BILL: AdminInvoice = {
  id: "inv-ben", jobId: "job-g", number: "INV-2026-0001", amount: 145, tax: 0, total: 145, sentOn: "2026-11-10", dueOn: "2026-11-24", status: "sent", visitIds: ["office-billed"],
  payUrl: "https://www.trailheadirrigation.com/pay/inv-ben?token=story",
}

export const oneOffs: Visit[] = [
  visit({ id: "office-scheduled", jobId: "job-a", property: YARD }),
  visit({ id: "office-needs-day", jobId: "job-b", clientId: "c-sam", clientName: "Sam Ortiz", town: "Louisville", kind: "install", status: "unscheduled", scheduledOn: undefined, startAt: undefined, personId: undefined, personName: undefined, price: 0, minutes: 120 }),
  visit({ id: "office-not-done", jobId: "job-c", clientId: "c-lee", clientName: "Lee Park", kind: "repair", status: "unscheduled", scheduledOn: undefined, startAt: undefined, personId: undefined, personName: undefined, notDoneReason: "no-water" }),
  visit({ id: "office-owed", jobId: "job-d", clientId: "c-ana", clientName: "Ana Ruiz", town: "Lafayette", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z", payments: [] }),
  visit({ id: "office-paid", jobId: "job-e", clientId: "c-joe", clientName: "Joe Hart", town: "Longmont", status: "completed", completedOn: "2026-11-09", scheduledOn: "2026-11-09", startAt: "2026-11-09T15:00:00Z", payments: [{ id: "pay-joe", jobId: "job-e", visitId: "office-paid", amount: 145, method: "check", status: "succeeded", paidOn: "2026-11-09" }] }),
  visit({ id: "office-day-passed", jobId: "job-f", clientId: "c-kim", clientName: "Kim Lowe", scheduledOn: "2026-11-09", startAt: "2026-11-09T15:00:00Z" }),
  visit({ id: "office-billed", jobId: "job-g", clientId: "c-ben", clientName: "Ben Cole", town: "Broomfield", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T16:00:00Z", payments: [], invoice: BEN_BILL }),
  visit({ id: "office-cancelled", jobId: "job-h", clientId: "c-joe", clientName: "Joe Hart", town: "Longmont", status: "cancelled", scheduledOn: "2026-11-23", startAt: "2026-11-23T15:00:00Z", payments: [] }),
]

const people: Client[] = [
  { id: "c-dana", firstName: "Dana", lastName: "Reed", town: "Erie", address: "12 Elm St", phone: "+13035550111", email: "dana@example.com", jobberUrl: "", hasPass: false, app: true },
  { id: "c-sam", firstName: "Sam", lastName: "Ortiz", town: "Louisville", address: "9 Oak St", phone: "+13035550122", jobberUrl: "", hasPass: false, app: true },
  { id: "c-lee", firstName: "Lee", lastName: "Park", town: "Erie", address: "4 Pine Ct", phone: "+13035550133", jobberUrl: "", hasPass: false, app: true },
  { id: "c-ana", firstName: "Ana", lastName: "Ruiz", town: "Lafayette", address: "77 Cedar Ln", phone: "+13035550144", jobberUrl: "", hasPass: false, app: true },
  { id: "c-joe", firstName: "Joe", lastName: "Hart", town: "Longmont", address: "3 Birch Rd", jobberUrl: "", hasPass: false, app: true },
  { id: "c-kim", firstName: "Kim", lastName: "Lowe", town: "Erie", address: "21 Maple Ave", phone: "+13035550166", jobberUrl: "", hasPass: false, app: true },
  { id: "c-ben", firstName: "Ben", lastName: "Cole", town: "Broomfield", address: "58 Spruce Way", phone: "+13035550177", email: "ben@example.com", jobberUrl: "", hasPass: false, app: true },
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
      ...(pv.payments ? { payments: pv.payments } : {}), price: pv.amount, minutes: 120,
      ...(pv.scheduledOn ? { personId: "person_truck-1", personName: "Ryan Garner" } : {}),
    })),
  )

/** A pass the office sold Dana by phone, with no card: she pays at each visit, so Done asks how it was paid and the pass panel offers Send card link. */
const officeSold = base.passes.find((p) => p.status === "active" && p.visits.length === 2)!
export const noCardPass: Pass = {
  ...officeSold,
  id: "p-office",
  number: "TH-2027-0014",
  clientId: "c-dana",
  firstName: "Dana",
  lastName: "Reed",
  town: "Erie",
  cardLast4: undefined,
  cardExpires: undefined,
  cardFailedAt: undefined,
  consent: { termsVersion: "2026-11", termsAcceptedAt: "2026-11-12T19:00:00Z", marketingOptIn: false, marketingChannels: [], source: "admin", recordedAt: "2026-11-12T19:00:00Z" },
  visits: officeSold.visits.map((v) => ({
    kind: v.kind, window: v.window, amount: v.amount, id: `p-office-${v.kind}`,
    ...(v.kind === "turn-on" ? { scheduledOn: "2027-05-04", scheduledAt: "2027-05-04T14:00:00Z", startTime: "08:00", personName: "Ryan Garner" } : {}),
  })),
}
export const noCardVisits: Visit[] = noCardPass.visits.map((pv) => ({
  id: pv.id!, clientId: "c-dana", clientName: "Dana Reed", town: "Erie", kind: pv.kind, status: pv.scheduledOn ? "scheduled" : "unscheduled", isPass: true, passId: noCardPass.id, jobId: "job_p-office", jobberUrl: "",
  ...(pv.scheduledOn ? { scheduledOn: pv.scheduledOn, startAt: pv.scheduledAt, startTime: pv.startTime, personId: "person_truck-1", personName: "Ryan Garner" } : {}), price: pv.amount, minutes: 60,
}))

const allVisits = [...oneOffs, ...passVisits, ...noCardVisits, ...base.visits]
const allPasses = [...base.passes, noCardPass]

/** The sold work behind the fixture's visits: one job per `jobId`, one line per visit with the service's own description, as the writers make them. */
const jobs: SoldJob[] = [...new Set(allVisits.map((v) => v.jobId).filter((id): id is string => Boolean(id)))].map((id) => {
  const mine = allVisits.filter((v) => v.jobId === id)
  const pass = allPasses.find((p) => mine.some((v) => v.passId === p.id))
  const lines: JobLine[] = mine.map((v) => {
    const line = lineForVisitKind(v.kind, v.price ?? 0, pass?.zones)
    return { id: `line-${v.id}`, name: line.name, ...(line.description ? { description: line.description } : {}), quantity: 1, unitPrice: line.unitPrice, taxable: false, visitId: v.id }
  })
  // The money of an office job is read from its lines, its payment rows and its open bill, as the live data does (a pass is charged to its card and left out).
  const invoice = mine.find((v) => v.invoice)?.invoice
  const payments = mine.flatMap((v) => v.payments ?? [])
  const money = pass ? undefined : jobMoney(lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, cancelledAt: null })), payments, mine.map((v) => ({ id: v.id, price: v.price })), invoice ? {} : undefined)
  const kind = pass ? "pass" : mine[0]!.kind === "install" ? "install" : "repair"
  // The sold day: the day a pass was bought (its consent's day), nothing for the one-offs (the Jobs fixture sets theirs).
  const soldOn = pass ? (pass.consent?.recordedAt.slice(0, 10) ?? "2026-11-02") : undefined
  return {
    id, customerId: mine[0]!.clientId, kind, source: pass ? "checkout" : "office", ...(soldOn ? { soldOn } : {}),
    status: stageOf({ kind, soldOn: soldOn ?? "2026-11-01", cancelledAt: pass?.status === "cancelled" ? "2026-11-10" : null, lines: lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, cancelledAt: null })), visits: mine }),
    ...(pass ? { passId: pass.id, passNumber: pass.number } : {}), visitIds: mine.map((v) => v.id), lines, total: lines.reduce((sum, l) => sum + l.unitPrice, 0),
    ...(money ? { payments, money } : {}), ...(invoice ? { invoice } : {}),
  }
})

export const visitsData: AdminData = {
  ...base,
  visits: allVisits,
  jobs,
  clients: [...people, ...base.clients],
  passes: allPasses,
  messages: [...messages, ...base.messages],
  attention: [],
}

/** A visit of an active pass that is booked and not yet done, for the panel's pass job block. */
export const passVisitId = passVisits.find((v) => v.status === "scheduled")?.id ?? passVisits[0]!.id
/** The scheduled visit of the pass with no card: Done asks how it was paid. */
export const noCardVisitId = "p-office-turn-on"
