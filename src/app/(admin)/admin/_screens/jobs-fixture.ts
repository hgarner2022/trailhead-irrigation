/**
 * The catalog's data for the Jobs screen: the Visits fixture (a pass the office sold, the snapshot's passes and one-offs in
 * every state) with the days the jobs were sold, one job whose bill is past its due day, one with a cancelled line and a
 * quote-later installation. Used by the stories and the tests only.
 */
import { stageOf } from "@/lib/jobs/stage"
import type { AdminData, AdminInvoice, JobLine, SoldJob } from "@/lib/admin/types"
import { VISITS_TODAY, visitsData } from "./visits-fixture"

export { VISITS_TODAY as JOBS_TODAY }

const SOLD: Record<string, string> = { "job-a": "2026-11-03", "job-b": "2026-11-05", "job-c": "2026-11-06", "job-d": "2026-11-04", "job-e": "2026-11-02", "job-f": "2026-11-08", "job-g": "2026-10-28", "job-h": "2026-11-01" }

/** Kim's bill went out two weeks before it was due and the due day has gone. */
export const KIM_BILL: AdminInvoice = { id: "inv-kim", jobId: "job-f", number: "INV-2026-0002", amount: 145, tax: 0, total: 145, sentOn: "2026-10-20", dueOn: "2026-11-03", status: "overdue", visitIds: ["office-day-passed"], payUrl: "https://www.trailheadirrigation.com/pay/inv-kim?token=story" }

const line = (id: string, name: string, unitPrice: number, over: Partial<JobLine> = {}): JobLine => ({ id, name, quantity: 1, unitPrice, taxable: false, ...over })

/** An installation Ryan priced after walking the yard: one line cancelled, the rest adding up to $1,310. */
const installJob: SoldJob = {
  id: "job-install", customerId: "c-lee", kind: "install", status: "open", source: "office", soldOn: "2026-11-09", visitIds: [],
  lines: [line("l-1", "Rotors, 12", 456, { quantity: 12, unitPrice: 38 }), line("l-2", "Controller", 300), line("l-3", "Labor", 554), line("l-4", "Drip zone", 200, { cancelledAt: "2026-11-10T16:00:00Z" })],
  total: 1310,
  payments: [{ id: "pay-lee", jobId: "job-install", amount: 500, method: "check", status: "succeeded", paidOn: "2026-11-10", reference: "1042" }],
  money: { paid: 500, total: 1310, owed: 810, words: "$810 owed" },
  notes: "Front yard first, then the strip along the fence.",
}

const jobs = visitsData.jobs!.map((j): SoldJob => {
  const base = { ...j, ...(SOLD[j.id] ? { soldOn: SOLD[j.id] } : {}) }
  if (j.id === "job-f") return { ...base, invoice: KIM_BILL, money: { paid: 0, total: 145, owed: 145, words: "Bill sent", billSent: true } }
  if (j.id === "job-e") return { ...base, payments: [{ id: "pay-joe", jobId: "job-e", visitId: "office-paid", amount: 145, method: "check", status: "succeeded", paidOn: "2026-11-09", reference: "1038" }], money: { paid: 145, total: 145, owed: 0, words: "Paid" } }
  return base
})

// Kim's visit is done, so her bill is for finished work.
const visits = visitsData.visits.map((v) => (v.id === "office-day-passed" ? { ...v, status: "completed" as const, completedOn: "2026-11-09", payments: [] } : v))

// A job's stage is read from its facts, so it follows the visits changed above (Kim's visit is done).
const staged = jobs.map((j): SoldJob => ({ ...j, status: stageOf({ kind: j.kind, soldOn: j.soldOn, cancelledAt: j.status === "cancelled" ? "2026-11-10" : null, lines: (j.lines ?? []).map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, cancelledAt: l.cancelledAt ? new Date(l.cancelledAt) : null })), visits: visits.filter((v) => v.jobId === j.id) }) }))

export const jobsData: AdminData = { ...visitsData, visits, jobs: [...staged, installJob] }
export const ownedJobId = "job-d"
export const billedJobId = "job-g"
export const overdueJobId = "job-f"
export const paidJobId = "job-e"
export const quoteJobId = "job-b"
export const cancelledLineJobId = "job-install"
export const passJobId = "job_p-office"
