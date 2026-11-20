"use client"

import { useState } from "react"
import { AsideCard } from "@/components/blocks/AsideCard"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { Photos } from "@/components/blocks/Photos"
import { recordHref } from "@/components/blocks/record-preview-model"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { useToast } from "@/components/blocks/Toast"
import type { PhotoItem } from "@/lib/photos/types"
import { NOW, noteOk } from "../job-fixtures"
import { ApproveByHandDialog, LineDialog, QuoteReminderDialog, ReviseDialog, SendQuoteDialog } from "./QuoteDialogs"
import { HOW_WORDS, LinesCard, QuoteBilling, QuoteCard, VisitCard, historyLines, quoteBand } from "./QuoteJobParts"
import { canSend, liveQuote, money, nextNumber, QUOTES_NOW, STAGE_PILL, stageOf, VIA_WORDS } from "./quote-model"
import { useQuoteJob, useQuoteJobs, type QuoteStore } from "./quote-store"

// The quote on the job (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.1, 4.5 and 4.6; Hannah's answers 3 to 8 of Nov 20 2026), as the job's page:
// a job that came from a request reads Needs a quote, Ryan prices its lines, "Send a quote" freezes them into a quote with an optional deposit and one link,
// the job reads Quote sent, and the customer approves or declines. The quote is a section of the job, not a list of its own (Jobs' Status filter has Needs a
// quote and Quote sent). While a quote is out the lines are locked; Revise marks it Replaced and returns the job to Needs a quote; Mark approved by hand
// takes a deposit by check, cash or Venmo. Every action that reaches the customer confirms and states its effect; a result is a toast and the page changes
// state, never a message in a section. Pure props over a store: a story makes its own.

type Dialog = "send" | "remind" | "revise" | "approve" | "cancel" | "refund" | { line: string } | null

export interface QuoteJobPageProps {
  store: QuoteStore
  jobId: string
  now?: string
  /** the photos the person sent with the request: they come along to the job */
  photos?: PhotoItem[]
  /** a dialog a story opens at once; a line is `{ line: "new" }` or a line's id */
  initialDialog?: Dialog
  /** where the Send a quote dialog's deposit starts (a story that shows a typed deposit) */
  sendInitial?: { mode: "none" | "dollars" | "percent"; value: string }
  /** "Schedule" on an approved job: the schedule dialog is the one every job has */
  onSchedule?: () => void
}

export function QuoteJobPage({ store, jobId, now = QUOTES_NOW, photos, initialDialog = null, sendInitial, onSchedule }: QuoteJobPageProps) {
  const toast = useToast()
  const job = useQuoteJob(store, jobId)
  const all = useQuoteJobs(store)
  const [dialog, setDialog] = useState<Dialog>(initialDialog)
  if (!job) return null
  const stage = stageOf(job)
  const q = liveQuote(job)
  const pill = STAGE_PILL[stage]
  const remindedToday = Boolean(q?.reminders.some((r) => r.at.slice(0, 10) === now.slice(0, 10)))
  const paid = q?.state === "approved" && q.deposit?.paid && !q.deposit.paid.refundedOn ? q.deposit.amount : 0
  const close = () => setDialog(null)
  const act = (label: string, onClick: () => void, disabled?: boolean): FooterAction => ({ label, onClick, disabled })
  const lineId = typeof dialog === "object" && dialog ? dialog.line : null
  const editLine = lineId && lineId !== "new" ? job.lines.find((l) => l.id === lineId) : undefined

  const actions =
    stage === "needs-a-quote" ? (
      <RecordFooter primary={act("Send a quote", () => setDialog("send"), !canSend(job))} more={[act("Add a line", () => setDialog({ line: "new" }))]} destructive={act("Cancel job", () => setDialog("cancel"))} destructiveInMenu />
    ) : stage === "quote-sent" ? (
      <RecordFooter primary={act(remindedToday ? "Reminded today" : "Send a quote reminder", () => setDialog("remind"), remindedToday)} secondary={[act("Mark approved", () => setDialog("approve")), act("Revise", () => setDialog("revise"))]} destructive={act("Cancel job", () => setDialog("cancel"))} destructiveInMenu />
    ) : stage === "open" ? (
      <RecordFooter primary={act("Schedule", () => (onSchedule ? onSchedule() : toast("The schedule dialog is the one every job has")))} destructive={act("Cancel job", () => setDialog("cancel"))} destructiveInMenu />
    ) : undefined

  const refundWords = q?.deposit?.paid ? `${job.first} is told by ${job.contact === "email" ? "email" : "text"}.` : ""
  return (
    <>
      <RecordPage
        crumb={{ label: "Jobs", href: "/admin/jobs" }}
        title={job.customer}
        subtitle={`${job.service} · ${job.requestId ? "Created from a request" : job.visit ? "Booked online" : "Added by the office"}`}
        badges={<StatusPill status={pill.status} label={pill.label} size="lg" />}
        notice={stage === "canceled" ? <p role="status" className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium shadow-sm">{q?.state === "declined" ? `${job.first} declined quote ${q.id}. The job is canceled.` : "This job is canceled."}</p> : undefined}
        band={<SummaryBand items={quoteBand(job)} />}
        asideLabel="About this job"
        actions={actions}
        aside={
          <>
            <AsideCard name={job.customer} href={recordHref.customer(job.customerId)} phone={{ text: job.phone, href: `tel:${job.phone.replace(/[^\d+]/g, "")}` }} address={[job.street, `${job.town}, CO`]} />
            <SectionCard title="Notes and history" id="notes-h">
              <NotesAndHistory bare lines={historyLines(job)} onAddNote={noteOk} now={NOW} />
            </SectionCard>
          </>
        }
      >
        {/* a job that needs a quote leads with the Quote section: pricing and sending is what its page is for */}
        {stage === "needs-a-quote" && <QuoteCard job={job} now={now} />}
        {job.visit && <VisitCard visit={job.visit} />}
        <LinesCard job={job} onAdd={() => setDialog({ line: "new" })} onEdit={(id) => setDialog({ line: id })} />
        {stage !== "needs-a-quote" && <QuoteCard job={job} now={now} />}
        <QuoteBilling job={job} onRefund={() => setDialog("refund")} />
        {photos && photos.length > 0 && (
          <SectionCard title="Photos" id="photos-h">
            <Photos bare heading={`From ${job.first}`} customerName={job.first} photos={photos} audience="staff" className="[&_ul]:mt-0" />
          </SectionCard>
        )}
      </RecordPage>

      {dialog === "send" && (
        <SendQuoteDialog
          job={job}
          number={nextNumber(Object.values(all))}
          initial={sendInitial}
          onClose={close}
          onSend={({ via, deposit }) => {
            const n = store.send(job.jobId, { via, deposit, at: now })
            toast(via === "none" ? `Quote ${n} sent without notifying ${job.first}` : `Quote ${n} sent to ${job.first} by ${VIA_WORDS[via]}`)
          }}
        />
      )}
      {dialog === "remind" && q && (
        <QuoteReminderDialog
          job={job}
          quote={q}
          onClose={close}
          onSend={({ via }) => {
            store.remind(job.jobId, { via, at: now })
            toast(`Reminder sent to ${job.first} by ${VIA_WORDS[via]}`)
          }}
        />
      )}
      {dialog === "revise" && q && (
        <ReviseDialog
          job={job}
          quote={q}
          onClose={close}
          onRevise={() => {
            store.revise(job.jobId, now)
            toast(`Quote ${q.id} is Replaced. The job needs a quote.`)
          }}
        />
      )}
      {dialog === "approve" && q && (
        <ApproveByHandDialog
          job={job}
          quote={q}
          onClose={close}
          onApprove={({ deposit, tell }) => {
            store.approve(job.jobId, { by: "Ryan", deposit, at: now })
            toast(tell ? `Quote ${q.id} approved. ${job.first} was told.` : `Quote ${q.id} approved. ${job.first} was not told.`)
          }}
        />
      )}
      {dialog === "refund" && q?.deposit?.paid && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Refund ${money(q.deposit.amount)}`}
          message={q.deposit.paid.how === "card" ? `Refund ${money(q.deposit.amount)} to the Visa ending 4242. ${refundWords}` : `Record a refund of the ${money(q.deposit.amount)} paid by ${HOW_WORDS[q.deposit.paid.how]}. ${refundWords}`}
          confirmLabel={`Refund ${money(q.deposit.amount)}`}
          destructive
          slot="refund-deposit-dialog"
          onConfirm={async () => (store.refund(job.jobId, now), toast(`Refunded ${money(q.deposit!.amount)} to ${job.first}`), { ok: true })}
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
      {lineId && (
        <LineDialog
          line={editLine}
          onClose={close}
          onSave={(l) => {
            const next = { name: l.name, description: l.description || undefined, amount: l.amount }
            if (editLine) store.updateLine(job.jobId, editLine.id, next)
            else store.addLine(job.jobId, next)
            toast(editLine ? "Line saved" : "Line added")
          }}
          onRemove={editLine ? () => (store.removeLine(job.jobId, editLine.id), toast("Line removed"), close()) : undefined}
        />
      )}
    </>
  )
}
