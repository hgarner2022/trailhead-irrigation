import { StatusPill, type PillStatus } from "@/components/blocks/StatusPill"
import type { JobStage } from "@/lib/jobs/stage"
import { STAGE_WORDS } from "@/lib/jobs/stage"
import type { JobMoneyState } from "./jobs-model"

// The job's two pills, the same two on the grid and in the panel: its stage (Needs a quote, Quote sent, Open, Done, Canceled, read
// from the facts) and its money (Unpaid, Invoice sent, Past due, Paid, Failed, nothing while nothing is due). They borrow the colour of
// the status they mean: Open is booked orange, Done green, Canceled grey, a quote waits.

const STAGE_TONE: Record<JobStage, PillStatus> = { "needs-a-quote": "needs-a-day", quoted: "pending", open: "scheduled", done: "done", cancelled: "cancelled" }
const MONEY_LABEL: Record<Exclude<JobMoneyState, "not-yet">, string> = { owed: "Unpaid", "bill-sent": "Invoice sent", overdue: "Past due", paid: "Paid", failed: "Failed" }

export function StagePill({ stage }: { stage: JobStage }) {
  return <StatusPill status={STAGE_TONE[stage]} label={STAGE_WORDS[stage]} data-pill="work" />
}

/** The job's money as one pill, or nothing while nothing is due. */
export function MoneyPill({ money }: { money: JobMoneyState }) {
  return money === "not-yet" ? null : <StatusPill status={money} label={MONEY_LABEL[money]} data-pill="money" />
}
