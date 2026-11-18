/**
 * The bill as the panels show it: whether a job can be billed, and the one line that says a bill is out. Pure; read from the
 * job's open bill (`SoldJob.invoice`), its money and its visits, never typed by hand.
 */
import type { AdminInvoice, SoldJob, Visit } from "@/lib/admin/types"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthDay = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`

/** "Bill sent Nov 17, due Dec 1", with ", overdue" once the day after the due day has come. */
export const billWords = (invoice: Pick<AdminInvoice, "sentOn" | "dueOn" | "status">): string =>
  `Bill sent ${monthDay(invoice.sentOn)}, due ${monthDay(invoice.dueOn)}${invoice.status === "overdue" ? ", overdue" : ""}`

export interface BillState {
  /** the job's open bill, if there is one */
  invoice?: AdminInvoice
  /** the job is Done, still owes money and has no open bill: Send a bill is offered */
  canSend: boolean
}

/**
 * A job's bill state. Send a bill is for a job whose every live visit is done, that still owes money, with no bill open. A
 * job charged to a card on file is left to the card (`chargedToCard`: its pass has a card that has not failed), which the
 * caller works out from the pass.
 */
export function billState(job: Pick<SoldJob, "invoice" | "money"> | undefined, visits: readonly Pick<Visit, "status" | "skipped">[], chargedToCard = false): BillState {
  if (!job) return { canSend: false }
  const live = visits.filter((v) => v.status !== "cancelled" && !v.skipped)
  const done = live.length > 0 && live.every((v) => v.status === "completed")
  return { ...(job.invoice ? { invoice: job.invoice } : {}), canSend: !job.invoice && done && (job.money?.owed ?? 0) > 0 && !chargedToCard }
}
