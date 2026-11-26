"use client"

import { useState } from "react"
import { CustomerCard } from "@/components/blocks/CustomerCard"
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
import type { QuoteArchiveReason } from "../requests/request-model"
import type { ServicePick } from "../requests/request-catalogue"
import { ChangeServiceDialog } from "./ChangeServiceDialog"
import { MISSING_ID, QuoteEditor } from "./QuoteEditor"
import { ApproveByHandDialog, ArchiveQuoteDialog, LineDialog, QuoteReminderDialog, ReviseDialog, SendQuoteDialog } from "./QuoteDialogs"
import { JobMadeCard, QuoteCard, QuoteLines, Revisions, VisitCard, historyLines, quoteBand } from "./QuoteParts"
import { canArchive, canChangeService, canSend, QUOTE_PILL, QUOTES_NOW, VIA_WORDS, type QuoteRecord } from "./quote-model"
import { useQuoteWorld, type QuoteStore } from "./quote-store"
import { Notice } from "@/components/blocks/Notice"

// A quote as a page of its own (Hannah, Nov 22 2026: "A quote probably should be [its own thing] until it's approved"), built like the invoice page: the quote number as the title with its
// status pill (no chip in the header), the band (Total, Deposit, Sent, Decision once it is sent), the one Quote editor while it is a Draft (price the lines in their rows, an optional deposit, then Send a quote) or its facts once it is out,
// What's included, Job (once approved: "Job created" with the job's chip), Revisions, and in the aside the one `CustomerCard` (the page's only link to the customer, with the address as text) and Notes and history. A quote has no Property card. While a quote is out its lines are
// locked; Revise marks it Replaced and makes a new Draft from it; Mark approved takes a deposit by check, cash or Venmo and creates the job. Archive asks why and archives the request the
// quote came from. Every action that reaches the customer confirms and states its effect; a result is a toast and the page changes state, never a message in a section. Pure props over a store.

type Dialog = "send" | "service" | "remind" | "revise" | "approve" | "archive" | { line: string } | null

export interface QuotePageProps {
  store: QuoteStore
  quoteId: string
  now?: string
  /** the photos the person sent with the request: they come along to the quote */
  photos?: PhotoItem[]
  /** a dialog a story opens at once; a line is `{ line: "new" }` or a line's id */
  initialDialog?: Dialog
  /** where Change service's picker starts (a story that shows the service being changed) */
  initialServicePick?: ServicePick
  /** a quote just made from a request or by hand: the cursor starts in the first empty price box */
  autoFocusPrice?: boolean
  /** a quote was archived: the host archives the request it came from, with the same reason */
  onArchived?: (quote: QuoteRecord, reason: QuoteArchiveReason) => void
}

const noticeOf = (q: QuoteRecord): string | undefined => {
  if (q.state === "archived") return `Archived as ${q.archived?.reason}.${q.requestId ? ` ${q.first}'s request is archived too.` : ""}`
  if (q.state === "declined") return `${q.first} declined quote ${q.id}. No job was made.`
  if (q.state === "replaced") return `Replaced by ${q.replacedBy}.`
  return undefined
}

export function QuotePage({ store, quoteId, now = QUOTES_NOW, photos, initialDialog = null, initialServicePick, autoFocusPrice, onArchived }: QuotePageProps) {
  const toast = useToast()
  const world = useQuoteWorld(store)
  const quote = world.quotes[quoteId]
  const job = quote?.jobId ? world.jobs[quote.jobId] : undefined
  const [dialog, setDialog] = useState<Dialog>(initialDialog)
  if (!quote) return null
  const q = quote
  const pill = QUOTE_PILL[q.state]
  const remindedToday = q.reminders.some((r) => r.at.slice(0, 10) === now.slice(0, 10))
  const close = () => setDialog(null)
  const act = (label: string, onClick: () => void, disabled?: boolean): FooterAction => ({ label, onClick, disabled })
  const lineId = typeof dialog === "object" && dialog ? dialog.line : null
  const editLine = lineId && lineId !== "new" ? q.lines.find((l) => l.id === lineId) : undefined
  const archive = canArchive(q) ? act("Archive", () => setDialog("archive")) : undefined
  const link = (label: string, href: string): FooterAction => ({ label, href })

  const actions =
    q.state === "draft" ? (
      <RecordFooter primary={{ ...act("Send a quote", () => setDialog("send"), !canSend(q)), ...(canSend(q) ? {} : { describedBy: MISSING_ID }) }} more={canChangeService(q) ? [act("Change service", () => setDialog("service"))] : undefined} destructive={archive} destructiveInMenu />
    ) : q.state === "sent" ? (
      <RecordFooter primary={act(remindedToday ? "Reminded today" : "Send a quote reminder", () => setDialog("remind"), remindedToday)} secondary={[act("Mark approved", () => setDialog("approve")), act("Revise", () => setDialog("revise"))]} destructive={archive} destructiveInMenu />
    ) : q.state === "approved" && q.jobId ? (
      <RecordFooter primary={link("Open job", recordHref.job(q.jobId))} />
    ) : q.state === "replaced" && q.replacedBy ? (
      <RecordFooter primary={link("Open the new quote", recordHref.quote(q.replacedBy))} />
    ) : archive ? (
      <RecordFooter destructive={archive} destructiveInMenu />
    ) : undefined

  const notice = noticeOf(q)
  return (
    <>
      <RecordPage
        crumb={{ label: "Quotes", href: "/admin/quotes" }}
        title={q.id}
        subtitle={`${q.service} · ${q.requestId ? "From a request" : q.visit ? "From a design visit" : q.replaces ? `Revision of ${q.replaces}` : "Made by the office"}`}
        badges={<StatusPill status={pill.status} label={pill.label} size="lg" />}
        notice={notice ? <Notice tone="page" role="status">{notice}</Notice> : undefined}
        band={<SummaryBand items={quoteBand(q)} />}
        asideLabel="About this quote"
        actions={actions}
        aside={
          <>
            <CustomerCard customer={{ id: q.customerId, name: q.customer }} phone={q.phone} address={[q.street, `${q.town}, CO`]} channel={q.contact} />
            <SectionCard title="Notes and history" id="notes-h">
              <NotesAndHistory bare lines={historyLines(q.history)} onAddNote={noteOk} now={NOW} />
            </SectionCard>
          </>
        }
      >
        {/* a Draft leads with the one Quote editor: its lines with their prices, the optional deposit and Send a quote. Once the quote is out the same place holds its facts. */}
        {q.state === "draft" ? (
          <QuoteEditor
            quote={q}
            autoFocusPrice={autoFocusPrice}
            onPrice={(id, amount) => store.updateLine(q.id, id, { amount })}
            onCancelLine={(id) => store.updateLine(q.id, id, { canceled: true })}
            onRestoreLine={(id) => store.updateLine(q.id, id, { canceled: false })}
            onEditLine={(id) => setDialog({ line: id })}
            onAddLine={() => setDialog({ line: "new" })}
            onDeposit={(input) => store.setDeposit(q.id, input)}
            onSend={() => setDialog("send")}
          />
        ) : (
          <>
            <QuoteCard quote={q} now={now} />
            <QuoteLines quote={q} />
          </>
        )}
        <JobMadeCard quote={q} job={job} />
        {q.visit && <VisitCard visit={q.visit} />}
        <Revisions quote={q} all={Object.values(world.quotes)} />
        {photos && photos.length > 0 && (
          <SectionCard title="Photos" id="photos-h">
            <Photos bare heading={`From ${q.first}`} customerName={q.first} photos={photos} audience="staff" className="[&_ul]:mt-0" />
          </SectionCard>
        )}
      </RecordPage>

      {dialog === "send" && (
        <SendQuoteDialog
          quote={q}
          onClose={close}
          onSend={({ via, deposit }) => {
            store.send(q.id, { via, deposit, at: now })
            toast(via === "none" ? `Quote ${q.id} sent without notifying ${q.first}` : `Quote ${q.id} sent to ${q.first} by ${VIA_WORDS[via]}`)
          }}
        />
      )}
      {dialog === "service" && (
        <ChangeServiceDialog
          quote={q}
          initialPick={initialServicePick}
          onClose={close}
          onChange={({ name, price }) => {
            store.changeService(q.id, { name, price, at: now })
            toast(`Service changed from ${q.service} to ${name}`)
          }}
        />
      )}
      {dialog === "remind" && (
        <QuoteReminderDialog
          quote={q}
          onClose={close}
          onSend={({ via }) => {
            store.remind(q.id, { via, at: now })
            toast(`Reminder sent to ${q.first} by ${VIA_WORDS[via]}`)
          }}
        />
      )}
      {dialog === "revise" && (
        <ReviseDialog
          quote={q}
          onClose={close}
          onRevise={() => {
            const next = store.revise(q.id, now)
            toast(`Quote ${q.id} is Replaced. ${next} is a new Draft.`)
          }}
        />
      )}
      {dialog === "approve" && (
        <ApproveByHandDialog
          quote={q}
          onClose={close}
          onApprove={({ deposit, tell }) => {
            store.approve(q.id, { by: "Ryan", deposit, at: now })
            toast(tell ? `Quote ${q.id} approved. Job created. ${q.first} was told.` : `Quote ${q.id} approved. Job created. ${q.first} was not told.`)
          }}
        />
      )}
      {dialog === "archive" && (
        <ArchiveQuoteDialog
          quote={q}
          onClose={close}
          onArchive={(reason) => {
            store.archive(q.id, reason, now)
            onArchived?.(q, reason)
            toast(`Archived as ${reason}`)
          }}
        />
      )}
      {lineId && (
        <LineDialog
          line={editLine}
          onClose={close}
          onSave={(l) => {
            const next = { name: l.name, description: l.description || undefined, amount: l.amount, quantity: l.quantity }
            if (editLine) store.updateLine(q.id, editLine.id, next)
            else store.addLine(q.id, next)
            toast(editLine ? "Line saved" : "Line added")
          }}
          onRemove={editLine ? () => {
            store.removeLine(q.id, editLine.id)
            toast("Line removed")
            close()
          } : undefined}
        />
      )}
    </>
  )
}
