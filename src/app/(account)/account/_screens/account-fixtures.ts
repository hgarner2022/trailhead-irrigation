// Fixtures for the account stories and tests: customer-safe jobs as `jobs.list` sends them. Andrea holds a Season Pass and had a repair; Dana has only
// one-off jobs. Days are in the 2027 season; `TODAY` sits two weeks before the turn-on.
import type { PortalCustomerType, PortalJobType, PortalVisitType } from "@/api/v1/portal/schemas"

export const TODAY = "2027-04-14"

const visit = (over: Partial<PortalVisitType> & Pick<PortalVisitType, "id" | "kind" | "name" | "status">): PortalVisitType => ({
  jobId: "job_pass", scheduledOn: null, startTime: null, durationMinutes: null, window: null, personFirstName: null, mustBeHome: false, notDoneReason: null, change: "no", ...over,
})

const line = (id: string, name: string, unitPrice: number, visitId: string | null = null, cancelledAt: string | null = null) => ({ id, name, description: null, quantity: 1, unitPrice, taxable: false, cancelledAt, visitId })

export const passJob: PortalJobType = {
  id: "job_pass", name: "Season Pass 2027", kind: "pass", passId: "job_pass", season: 2027, passNumber: "TH-2027-0001", soldOn: "2027-03-02", canceled: false, stage: "open", address: "412 Briggs Street",
  lines: [line("l1", "Spring turn-on", 120, "v1"), line("l2", "Fall blowout", 120, "v2")],
  total: 240, money: { paid: 0, owed: 240, words: "$240 unpaid" },
  visits: [
    visit({ id: "v1", kind: "turn-on", name: "Spring turn-on", status: "scheduled", scheduledOn: "2027-04-28", startTime: "09:00", durationMinutes: 120, window: "May", personFirstName: "Ryan", mustBeHome: true, change: "yes" }),
    visit({ id: "v2", kind: "blowout", name: "Fall blowout", status: "unscheduled", window: "October", change: "yes" }),
  ],
  payments: [], invoices: [],
}

export const repairJob: PortalJobType = {
  id: "job_repair", name: "Repair", kind: "repair", passId: null, season: null, passNumber: null, soldOn: "2026-11-03", canceled: false, stage: "done", address: "412 Briggs Street",
  lines: [line("l3", "Repair", 145, "v3")],
  total: 145, money: { paid: 145, owed: 0, words: "Paid" },
  visits: [visit({ id: "v3", jobId: "job_repair", kind: "repair", name: "Repair", status: "completed", scheduledOn: "2026-11-03", personFirstName: "Ryan" })],
  payments: [{ id: "pay_1", visitId: "v3", amount: 145, method: "card_on_file", reference: null, paidOn: "2026-11-03", refundsPaymentId: null, receiptUrl: "https://pay.stripe.com/receipts/example" }],
  invoices: [],
}

/** A repair that is done and owes $115, with an invoice out, due Dec 1. */
export const invoicedJob: PortalJobType = {
  ...repairJob, id: "job_invoiced", name: "Repair", soldOn: "2027-03-20", total: 115, money: { paid: 0, owed: 115, words: "Invoice sent" },
  lines: [line("l4", "Repair", 115, "v4")],
  visits: [visit({ id: "v4", jobId: "job_invoiced", kind: "repair", name: "Repair", status: "completed", scheduledOn: "2027-03-20", personFirstName: "Ryan" })],
  payments: [], invoices: [{ id: "inv_1", number: "INV-2027-0001", total: 115, sentOn: "2027-03-21", dueOn: "2027-12-01", paidOn: null, status: "sent", payUrl: "/pay/inv_1?token=abc" }],
}

/** Part paid by check: $80 of $145 in, the rest unpaid, no invoice. */
export const partPaidJob: PortalJobType = {
  ...repairJob, id: "job_part", soldOn: "2027-02-10", total: 145, money: { paid: 80, owed: 65, words: "$65 unpaid" },
  lines: [line("l5", "Repair", 145, "v5"), line("l6", "Extra head", 20, null, "2027-02-11T12:00:00.000Z")],
  visits: [visit({ id: "v5", jobId: "job_part", kind: "repair", name: "Repair", status: "completed", scheduledOn: "2027-02-10", personFirstName: "Ryan" })],
  payments: [{ id: "pay_2", visitId: "v5", amount: 80, method: "check", reference: "1043", paidOn: "2027-02-12", refundsPaymentId: null, receiptUrl: null }],
  invoices: [],
}

export const pastDueJob: PortalJobType = {
  ...invoicedJob, id: "job_late", invoices: [{ ...invoicedJob.invoices[0]!, id: "inv_2", dueOn: "2027-04-01", status: "overdue", payUrl: "/pay/inv_2?token=def" }],
}

export const andrea: PortalCustomerType = {
  id: "c1", firstName: "Andrea", lastName: "Lopez", email: "andrea@example.com", phone: "+19705550142", hasHeldPass: true,
  card: { brand: "visa", last4: "4242", expires: "2028-08", failedAt: null },
  properties: [{ id: "p1", address: "412 Briggs Street", town: "Erie", zones: 8, controller: "Rachio 3", backflowLocation: "Left of the garage", gateCode: "4471", mustBeHome: true, accessNote: "Dog in the yard, use the side gate", contactName: "Marcus", contactPhone: "+19705550177" }],
}

export const dana: PortalCustomerType = { ...andrea, id: "c2", firstName: "Dana", lastName: "Quill", email: "dana@example.com", hasHeldPass: false, card: null, properties: [{ ...andrea.properties[0]!, id: "p2", address: "12 Cottonwood Way", mustBeHome: false, gateCode: null, accessNote: null, contactName: null, contactPhone: null }] }
