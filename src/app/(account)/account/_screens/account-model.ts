// What the account screens pick out of a customer's jobs, pure: the invoices waiting to be paid and the ids of the visits that need offered days. The timeline itself
// (the next visit, Coming up and Past) is `portalTimeline` in `src/lib/portal/timeline.ts`. Everything reads the customer-safe `PortalJob` the API sends (`jobs.list`).
import type { PortalJobType } from "@/api/v1/portal/schemas"
import type { TimelineRow } from "@/lib/portal/timeline"

export interface OpenInvoice {
  id: string
  jobId: string
  /** what the invoice is for: the name of the job */
  jobName: string
  total: number
  dueOn: string
  status: "sent" | "overdue"
  payHref: string
}

/** The invoices waiting to be paid, oldest due day first. Only an open one with a pay link counts; a paid invoice is history. */
export function openInvoices(jobs: readonly PortalJobType[]): OpenInvoice[] {
  return jobs
    .filter((j) => !j.canceled)
    .flatMap((j) => j.invoices.filter((i) => i.status !== "paid" && i.payUrl).map((i) => ({ id: i.id, jobId: j.id, jobName: j.name, total: i.total, dueOn: i.dueOn, status: i.status as "sent" | "overdue", payHref: i.payUrl! })))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
}

/** The ids of the visits whose day the customer may pick or change online, so the page asks `visits.areaDays` for those and no others. */
export const visitsToOffer = (rows: readonly TimelineRow[]): string[] => rows.filter((r) => r.visit.reschedule === "yes").map((r) => r.id)
