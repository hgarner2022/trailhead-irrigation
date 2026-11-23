import type { GridJob } from "../JobsGridDesign"
import { currentTotal } from "./price-change"
import { jobStageOf, money, type ApprovedJob } from "./quote-model"

// The Jobs grid's row for a job made from an approved quote (Hannah, Nov 22 2026: the job is made only at approval, so the Jobs list holds only real work and has no Needs a quote
// or Quote sent): its Status is Unscheduled until it has a day, or Canceled, the Total follows the job's lines (a price change after approval), and Billing is the balance once a
// deposit is paid. A row is made for every job in the quote store. Pure.

const NO_ONE = "No one yet"

/** The row of the grid for a job made from a quote: a new one, or a fixture's row read again from the job. */
export function jobGridRow(job: ApprovedJob, base?: GridJob): GridJob {
  const total = currentTotal(job)
  const paid = job.deposit?.paid && !job.deposit.paid.refundedOn ? job.deposit.amount : 0
  const canceled = jobStageOf(job) === "canceled"
  return {
    id: job.jobId,
    name: job.customer,
    service: job.service,
    title: job.service,
    property: `${job.street}, ${job.town}`,
    who: NO_ONE,
    season: "",
    visits: "0 of 1 done",
    ...base,
    stage: canceled ? "cancelled" : "unscheduled",
    total,
    billingState: paid ? "owed" : null,
    billing: paid ? `${money(total - paid)} unpaid` : "",
    next: canceled ? "None" : "Unscheduled",
  }
}
