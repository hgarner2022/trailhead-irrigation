"use client"

import { Button } from "@/components/ui/button"
import type { AdminData, AdminInvoice, SoldJob } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { billState, billWords, type BillState } from "./bill-model"
import { FORM_STATUS, useRunner } from "./use-runner"

// The bill on a job, in the visit panel and the customer panel. A Done job that still owes money offers Send a bill; once one
// is out the panel says "Bill sent Nov 17, due Dec 1" with Remind and the customer's pay link. Both are the office's buttons:
// a tech's panels render none of it (the pay link is not even in a tech's data).

/** The one line that says a bill is out, with the pay link and Remind. */
export function BillSent({ invoice, actions }: { invoice: AdminInvoice; actions?: VisitActions }) {
  const { pending, error, done, run } = useRunner()
  return (
    <div data-slot="bill-sent" className="text-sm">
      <p className="font-medium">{billWords(invoice)}</p>
      <p className="mt-1 text-muted-foreground">{`${invoice.number}, $${invoice.total.toLocaleString("en-US")}`}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={() => (actions ? run(() => actions.remindBill(invoice.id), undefined, "Reminder sent.") : console.info("remind", invoice.id))}
        >
          Remind
        </Button>
        {invoice.payUrl && (
          <a href={invoice.payUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-primary-dark underline underline-offset-2">
            Pay link
          </a>
        )}
      </div>
      <p role="alert" className={`${FORM_STATUS} mt-1 ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || done}
      </p>
    </div>
  )
}

/** Send a bill, for a Done job that owes money: freezes the lines and sends the pay link by text, or by email when there is no mobile. */
export function SendBill({ jobId, actions }: { jobId: string; actions?: VisitActions }) {
  const { pending, error, done, run } = useRunner()
  return (
    <div data-slot="send-bill">
      <Button
        type="button"
        className="min-h-11"
        disabled={pending}
        onClick={() => (actions ? run(() => actions.sendBill(jobId), undefined, "Bill sent.") : console.info("send a bill", jobId))}
      >
        Send a bill
      </Button>
      <p className="mt-1 text-sm text-muted-foreground">Texts a pay link, or emails it when there is no mobile.</p>
      <p role="alert" className={`${FORM_STATUS} mt-1 ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || done}
      </p>
    </div>
  )
}

/** What a job is called in the bills list: its pass number, else the names of its live lines. */
const jobTitle = (job: SoldJob): string => (job.passNumber ? `Season Pass ${job.passNumber}` : (job.lines ?? []).filter((l) => !l.cancelledAt).map((l) => l.name).join(", ") || "Job")

/**
 * A customer's jobs that can be billed or have a bill out, each with Send a bill or the sent bill. Nothing when there are none;
 * the office's own section (a tech's panel does not render it).
 */
export function CustomerBills({ jobs, data, actions }: { jobs: SoldJob[]; data: Pick<AdminData, "visits" | "passes">; actions?: VisitActions }) {
  const rows = jobs
    .map((job) => {
      const pass = data.passes.find((p) => p.id === job.passId)
      const visits = data.visits.filter((v) => v.jobId === job.id)
      // a job charged to the card on its pass is left to the card, unless that card failed
      const failed = visits.some((v) => v.chargeFailed) || Boolean(pass?.cardFailedAt)
      return { job, state: billState(job, visits, Boolean(pass?.cardLast4) && !failed) }
    })
    .filter((r) => r.state.invoice || r.state.canSend)
  if (rows.length === 0) return null
  return (
    <section aria-labelledby="customer-bills" data-slot="customer-bills">
      <h3 id="customer-bills" className="font-display text-lg leading-tight text-navy">
        Bills
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {rows.map(({ job, state }) => (
          <li key={job.id} className="py-3">
            <p className="mb-2 text-sm font-medium">{`${jobTitle(job)}${job.money?.words ? `, ${job.money.words.toLowerCase()}` : ""}`}</p>
            {state.invoice ? <BillSent invoice={state.invoice} actions={actions} /> : <SendBill jobId={job.id} actions={actions} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The bill block of a job: Send a bill, or the sent bill. Nothing when the job can be neither billed nor has a bill. */
export function BillBlock({ state, jobId, actions, headingId, className }: { state: BillState; jobId: string; actions?: VisitActions; headingId: string; className?: string }) {
  if (!state.invoice && !state.canSend) return null
  return (
    <section aria-labelledby={headingId} className={className}>
      <h3 id={headingId} className="mb-2 font-display text-lg leading-tight text-navy">
        Bill
      </h3>
      {state.invoice ? <BillSent invoice={state.invoice} actions={actions} /> : <SendBill jobId={jobId} actions={actions} />}
    </section>
  )
}
