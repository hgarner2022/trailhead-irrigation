"use client"

import { useState } from "react"
import { CustomerCard } from "@/components/blocks/CustomerCard"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { Photos } from "@/components/blocks/Photos"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { useToast } from "@/components/blocks/Toast"
import type { PhotoItem } from "@/lib/photos/types"
import { NOW, noteOk } from "../job-fixtures"
import { PriceChangeDialog } from "./PriceChangeDialog"
import { LineDialog } from "./QuoteDialogs"
import { historyLines } from "./QuoteParts"
import { HOW_WORDS } from "./QuoteParts"
import { FromQuoteCard, LinesCard, QuoteBilling, jobBand } from "./ApprovedJobParts"
import { untoldChange, type PriceChange } from "./price-change"
import { jobStageOf, money, QUOTES_NOW, STAGE_PILL, VIA_WORDS } from "./quote-model"
import { useQuoteWorld, type QuoteStore } from "./quote-store"
import { Notice } from "@/components/blocks/Notice"

// The page of a job made from an approved quote (Hannah, Nov 22 2026: a job is created only when the quote is approved, so it has no quote state of its own: no Needs a quote, no Quote sent, no
// quote editor). It is ready to schedule with no day, says which quote it came from ONCE (that quote's chip, in the aside under the customer; not in the subtitle and not in the band), has the band every job has (When, Who, Where, Total), and holds the approved lines, copied once from the frozen quote. A price change after
// approval is made HERE: Ryan edits the lines and tells the customer (no second approval, the quote stays as it was approved). Billing shows the deposit already paid. Cancel job is blocked
// while the deposit is paid, until Ryan refunds it himself. Every action that reaches the customer confirms; a result is a toast and the page changes state. Pure props over a store.

type Dialog = "cancel" | "refund" | { line: string } | null

export interface ApprovedJobPageProps {
  store: QuoteStore
  jobId: string
  now?: string
  /** the photos the person sent with the request: they come along from the quote */
  photos?: PhotoItem[]
  /** a dialog a story opens at once; a line is `{ line: "new" }` or a line's id */
  initialDialog?: Dialog
  /** "Schedule": the schedule dialog is the one every job has */
  onSchedule?: () => void
  /** the Tell the customer dialog open on first render (the story that shows it) */
  initialTell?: PriceChange | null
}

export function ApprovedJobPage({ store, jobId, now = QUOTES_NOW, photos, initialDialog = null, onSchedule, initialTell = null }: ApprovedJobPageProps) {
  const toast = useToast()
  const job = useQuoteWorld(store).jobs[jobId]
  const [dialog, setDialog] = useState<Dialog>(initialDialog)
  // the Tell the customer step after a price change: its own state, so the line dialog closing never closes it
  const [tell, setTell] = useState<PriceChange | null>(initialTell)
  if (!job) return null
  const stage = jobStageOf(job)
  const pill = STAGE_PILL[stage]
  const paid = job.deposit?.paid && !job.deposit.paid.refundedOn ? job.deposit.amount : 0
  const close = () => setDialog(null)
  const act = (label: string, onClick: () => void): FooterAction => ({ label, onClick })
  const lineId = typeof dialog === "object" && dialog ? dialog.line : null
  const editLine = lineId && lineId !== "new" ? job.lines.find((l) => l.id === lineId) : undefined
  const refundWords = job.deposit?.paid ? `${job.first} is told by ${job.contact === "email" ? "email" : "text"}.` : ""
  const actions =
    stage === "open" ? (
      <RecordFooter primary={act("Schedule", () => (onSchedule ? onSchedule() : toast("The schedule dialog is the one every job has")))} more={[act("Add a line", () => setDialog({ line: "new" }))]} destructive={act("Cancel job", () => setDialog("cancel"))} destructiveInMenu />
    ) : undefined

  return (
    <>
      <RecordPage
        crumb={{ label: "Jobs", href: "/admin/jobs" }}
        title={job.customer}
        subtitle={job.service}
        badges={<StatusPill status={pill.status} label={pill.label} size="lg" />}
        notice={stage === "canceled" ? <Notice tone="page" role="status">This job is canceled.</Notice> : undefined}
        band={<SummaryBand items={jobBand(job)} />}
        asideLabel="About this job"
        actions={actions}
        aside={
          <>
            <CustomerCard customer={{ id: job.customerId, name: job.customer }} phone={job.phone} address={[job.street, `${job.town}, CO`]} channel={job.contact} />
            <FromQuoteCard job={job} />
            <SectionCard title="Notes and history" id="notes-h">
              <NotesAndHistory bare lines={historyLines(job.history)} onAddNote={noteOk} now={NOW} />
            </SectionCard>
          </>
        }
      >
        <LinesCard job={job} onAdd={() => setDialog({ line: "new" })} onEdit={(id) => setDialog({ line: id })} onTell={() => setTell(untoldChange(job))} />
        <QuoteBilling job={job} onRefund={() => setDialog("refund")} />
        {photos && photos.length > 0 && (
          <SectionCard title="Photos" id="photos-h">
            <Photos bare heading={`From ${job.first}`} customerName={job.first} photos={photos} audience="staff" className="[&_ul]:mt-0" />
          </SectionCard>
        )}
      </RecordPage>

      {dialog === "refund" && job.deposit?.paid && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Refund ${money(job.deposit.amount)}`}
          message={job.deposit.paid.how === "card" ? `Refund ${money(job.deposit.amount)} to the Visa ending 4242. ${refundWords}` : `Record a refund of the ${money(job.deposit.amount)} paid by ${HOW_WORDS[job.deposit.paid.how]}. ${refundWords}`}
          confirmLabel={`Refund ${money(job.deposit.amount)}`}
          destructive
          slot="refund-deposit-dialog"
          onConfirm={async () => (store.refund(job.jobId, now), toast(`Refunded ${money(job.deposit!.amount)} to ${job.first}`), { ok: true })}
        />
      )}
      {dialog === "cancel" && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title="Cancel this job?"
          message={`Cancel the job for ${job.customer}. Nothing is sent to ${job.first}.`}
          blocked={paid ? "This job has a payment. Refund it first." : undefined}
          confirmLabel="Cancel job"
          destructive
          slot="cancel-quote-job-dialog"
          onConfirm={async () => (store.cancelJob(job.jobId, now), toast("Job canceled"), { ok: true })}
        />
      )}
      {tell && (
        <PriceChangeDialog
          job={job}
          change={tell}
          onClose={() => setTell(null)}
          onSend={({ via }) => {
            store.tellPrice(job.jobId, { via, at: now })
            toast(via === "none" ? `The new total, ${money(tell.to)}, is kept. ${job.first} was not told.` : `${job.first} was told the new total, ${money(tell.to)}, by ${VIA_WORDS[via]}`)
          }}
        />
      )}
      {lineId && (
        <LineDialog
          line={editLine}
          approved
          onClose={close}
          onSave={(l) => {
            const next = { name: l.name, description: l.description || undefined, amount: l.amount, quantity: l.quantity }
            // a change that moves the total opens the Tell the customer step
            const moved = editLine ? store.updateJobLine(job.jobId, editLine.id, next, now) : store.addJobLine(job.jobId, next, now)
            toast(editLine ? "Line saved" : "Line added")
            if (moved) setTell(moved)
          }}
          onRemove={editLine ? () => {
            const moved = store.cancelJobLine(job.jobId, editLine.id, now)
            toast("Line canceled")
            if (moved) setTell(moved)
            close()
          } : undefined}
        />
      )}
    </>
  )
}
