// Fixtures for the account stories and tests: customer-safe jobs as `jobs.list` sends them. Andrea holds a Season Pass and had a repair; Dana has only
// one-off jobs. Days are in the 2027 season; `TODAY` sits two weeks before the turn-on (Wednesday, April 28).
import type { PortalCustomerType, PortalJobType, PortalVisitType } from "@/api/v1/portal/schemas"

export const TODAY = "2027-04-14"

const NO_MONEY = { tone: "none" as const, label: "", paymentIds: [] }

/** A visit as the API sends it: nothing told yet, nothing priced, nothing the customer may do, until the case says so. */
export const visit = (over: Partial<PortalVisitType> & Pick<PortalVisitType, "id" | "kind" | "name" | "status">): PortalVisitType => ({
  jobId: "job_pass", scheduledOn: null, completedOn: null, canceledOn: null, windowTold: false, window: null, month: null, personFirstName: null, price: 0, money: NO_MONEY, mustBeHome: false, notDoneReason: null, reschedule: "no", cancel: "no", cancelsBy: null, ...over,
})

const line = (id: string, name: string, unitPrice: number, visitId: string | null = null, cancelledAt: string | null = null, description: string | null = null) => ({ id, name, description, quantity: 1, unitPrice, taxable: false, cancelledAt, visitId })

export const passJob: PortalJobType = {
  id: "job_pass", name: "Season Pass 2027", kind: "pass", passId: "job_pass", season: 2027, passNumber: "TH-2027-0001", soldOn: "2027-03-02", canceled: false, open: true, stage: "open", address: "412 Briggs Street", town: "Erie",
  lines: [line("l1", "Spring turn-on", 120, "v1", null, "8 zones, start up, check each head"), line("l2", "Fall blowout", 120, "v2")],
  total: 240, money: { paid: 0, owed: 240, words: "$240 unpaid" },
  visits: [
    visit({ id: "v1", kind: "turn-on", name: "Spring turn-on", status: "scheduled", scheduledOn: "2027-04-28", month: "May", mustBeHome: true, price: 120, reschedule: "yes", cancel: "yes", cancelsBy: "Monday, April 26, 11:59 pm" }),
    visit({ id: "v2", kind: "blowout", name: "Fall blowout", status: "unscheduled", month: "October", price: 120, reschedule: "yes", cancel: "yes" }),
  ],
  payments: [], invoices: [],
}

/** The turn-on once the day-before text went out (the day before, so inside the 24 hours): the window and who is coming are told, and Text Ryan replaces the buttons. */
export const passJobWindowTold: PortalJobType = { ...passJob, visits: [{ ...passJob.visits[0]!, windowTold: true, window: "between 8 and 10 am", personFirstName: "Ryan", reschedule: "text", cancel: "text", cancelsBy: null }, passJob.visits[1]!] }

/** The turn-on is inside 24 hours: Text Ryan and Call Ryan replace Reschedule and Cancel. */
export const passJobInsideCutoff: PortalJobType = { ...passJob, visits: [{ ...passJob.visits[0]!, reschedule: "text", cancel: "text", cancelsBy: null }, passJob.visits[1]!] }

/** The turn-on was canceled (a pass skip); the blowout is still ahead. */
export const passJobCanceledVisit: PortalJobType = {
  ...passJob, lines: [line("l1", "Spring turn-on", 120, "v1", "2027-04-10T12:00:00.000Z"), line("l2", "Fall blowout", 120, "v2")], total: 120, money: { paid: 0, owed: 120, words: "$120 unpaid" },
  visits: [visit({ id: "v1", kind: "turn-on", name: "Spring turn-on", status: "skipped", canceledOn: "2027-04-10", month: "May" }), passJob.visits[1]!],
}

/** A Season Pass that was canceled: its visits read Canceled. */
export const passJobCanceled: PortalJobType = {
  ...passJob, canceled: true, open: false, stage: "cancelled",
  visits: passJob.visits.map((v) => ({ ...v, status: "skipped" as const, scheduledOn: null, canceledOn: "2027-04-10", reschedule: "no" as const, cancel: "no" as const })),
}

/** A one-off turn-on, booked for May 12, on a job of its own. */
export const oneOffJob: PortalJobType = {
  id: "job_turn_on", name: "Spring turn-on", kind: "other", passId: null, season: null, passNumber: null, soldOn: "2027-04-02", canceled: false, open: true, stage: "open", address: "12 Cottonwood Way", town: "Erie",
  lines: [line("l7", "Spring turn-on", 145, "v6", null, "Start up, run every zone, check each head")],
  total: 145, money: { paid: 0, owed: 145, words: "$145 unpaid" },
  visits: [visit({ id: "v6", jobId: "job_turn_on", kind: "turn-on", name: "Spring turn-on", status: "scheduled", scheduledOn: "2027-05-12", month: "May", price: 145, reschedule: "yes", cancel: "yes", cancelsBy: "Monday, May 10, 11:59 pm" })],
  payments: [], invoices: [],
}

export const repairJob: PortalJobType = {
  id: "job_repair", name: "Repair", kind: "repair", passId: null, season: null, passNumber: null, soldOn: "2026-11-03", canceled: false, open: true, stage: "done", address: "412 Briggs Street", town: "Erie",
  lines: [line("l3", "Repair", 145, "v3")],
  total: 145, money: { paid: 145, owed: 0, words: "Paid" },
  visits: [visit({ id: "v3", jobId: "job_repair", kind: "repair", name: "Repair", status: "completed", scheduledOn: "2026-11-03", completedOn: "2026-11-03", personFirstName: "Ryan", windowTold: true, price: 145, money: { tone: "paid", label: "Paid", paymentIds: ["pay_1"] } })],
  payments: [{ id: "pay_1", visitId: "v3", amount: 145, method: "card_on_file", reference: null, paidOn: "2026-11-03", refundsPaymentId: null, receiptUrl: "https://pay.stripe.com/receipts/example" }],
  invoices: [],
}

/** A repair that is done and owes $115, with an invoice out, due Dec 1. */
export const invoicedJob: PortalJobType = {
  ...repairJob, id: "job_invoiced", name: "Repair", soldOn: "2027-03-20", total: 115, money: { paid: 0, owed: 115, words: "Invoice sent" },
  lines: [line("l4", "Repair", 115, "v4")],
  visits: [visit({ id: "v4", jobId: "job_invoiced", kind: "repair", name: "Repair", status: "completed", scheduledOn: "2027-03-20", completedOn: "2027-03-20", personFirstName: "Ryan", windowTold: true, price: 115, money: { tone: "invoice-sent", label: "Invoice sent, due Dec 1", paymentIds: [] } })],
  payments: [], invoices: [{ id: "inv_1", number: "INV-2027-0001", total: 115, sentOn: "2027-03-21", dueOn: "2027-12-01", paidOn: null, status: "sent", payUrl: "/pay/inv_1?token=abc" }],
}

/** Part paid by check: $80 of $145 in, the rest unpaid, no invoice. */
export const partPaidJob: PortalJobType = {
  ...repairJob, id: "job_part", soldOn: "2027-02-10", total: 145, money: { paid: 80, owed: 65, words: "$65 unpaid" },
  lines: [line("l5", "Repair", 145, "v5"), line("l6", "Extra head", 20, null, "2027-02-11T12:00:00.000Z")],
  visits: [visit({ id: "v5", jobId: "job_part", kind: "repair", name: "Repair", status: "completed", scheduledOn: "2027-02-10", completedOn: "2027-02-10", personFirstName: "Ryan", windowTold: true, price: 145, money: { tone: "unpaid", label: "$65 unpaid", paymentIds: ["pay_2"] } })],
  payments: [{ id: "pay_2", visitId: "v5", amount: 80, method: "check", reference: "1043", paidOn: "2027-02-12", refundsPaymentId: null, receiptUrl: null }],
  invoices: [],
}

export const pastDueJob: PortalJobType = {
  ...invoicedJob, id: "job_late",
  visits: [{ ...invoicedJob.visits[0]!, id: "v7", jobId: "job_late", money: { tone: "past-due", label: "Past due since Apr 1", paymentIds: [] } }],
  invoices: [{ ...invoicedJob.invoices[0]!, id: "inv_2", dueOn: "2027-04-01", status: "overdue", payUrl: "/pay/inv_2?token=def" }],
}

/** A one-off repair that Andrea canceled: nothing was charged. */
export const canceledRepairJob: PortalJobType = {
  ...repairJob, id: "job_canceled", name: "Repair", soldOn: "2027-03-30", canceled: true, open: false, stage: "cancelled", total: 0, money: { paid: 0, owed: 0, words: "" },
  lines: [line("l8", "Repair", 145, "v8", "2027-04-02T12:00:00.000Z")],
  visits: [visit({ id: "v8", jobId: "job_canceled", kind: "repair", name: "Repair", status: "cancelled", canceledOn: "2027-04-02" })],
  payments: [], invoices: [],
}

export const andrea: PortalCustomerType = {
  id: "c1", firstName: "Andrea", lastName: "Lopez", email: "andrea@example.com", phone: "+19705550142", hasHeldPass: true,
  card: { brand: "visa", last4: "4242", expires: "2028-08", failedAt: null },
  properties: [{ id: "p1", address: "412 Briggs Street", town: "Erie", zones: 8, controller: "Rachio 3", backflowLocation: "Left of the garage", gateCode: "4471", mustBeHome: true, accessNote: "Dog in the yard, use the side gate", contactName: "Marcus", contactPhone: "+19705550177" }],
}

export const dana: PortalCustomerType = { ...andrea, id: "c2", firstName: "Dana", lastName: "Quill", email: "dana@example.com", hasHeldPass: false, card: null, properties: [{ ...andrea.properties[0]!, id: "p2", address: "12 Cottonwood Way", mustBeHome: false, gateCode: null, accessNote: null, contactName: null, contactPhone: null }] }

/** Andrea with a second property, so rows name their street and Visits offers the street filter. */
export const andreaTwoProperties: PortalCustomerType = { ...andrea, properties: [...andrea.properties, { ...andrea.properties[0]!, id: "p3", address: "12 Cottonwood Way", gateCode: null, accessNote: null }] }
