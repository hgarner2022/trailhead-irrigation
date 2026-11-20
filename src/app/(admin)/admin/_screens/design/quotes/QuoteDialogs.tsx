"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { SplitButton } from "@/components/blocks/SplitButton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { quoteLink, quoteReminderText, quoteText, quoteSubject, quoteReminderSubject, quoteLead, quoteReminderLead } from "@/lib/portal/quote-words"
import { REMINDER_LINE_MAX } from "../confirm-copy"
import { depositOf, linesTotal, money, type Channel, type DepositHow, type DepositMode, type QuoteData, type QuoteJob, type QuoteLine } from "./quote-model"

// The questions of the quote (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.6; Hannah's answers 3 to 8 of Nov 20 2026). Every action that reaches the
// customer confirms in a dialog that states its exact effect and the channel from their contact preference, with a "without notifying" caret on a send; a
// reminder has none, because the reminder is the notification. A deposit is none by default, typed as dollars or a percent, frozen as dollars and never
// above the total. Pure props: the page keeps the state.

const SELECT = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
export const CHANNEL_OPTIONS = (job: QuoteJob) => [
  { value: "text", label: "Text", disabled: !job.phone, reason: "No mobile number on file" },
  { value: "email", label: "Email", disabled: !job.email, reason: "No email on file" },
  { value: "both", label: "Both", disabled: !job.phone || !job.email, reason: job.phone ? "No email on file" : "No mobile number on file" },
]
export const channelWords = (job: QuoteJob, c: Channel) => (c === "text" ? `by text at ${job.phone}` : c === "email" ? `by email at ${job.email}` : "by text and email")

/** The facts the customer's words are built from. */
export const factsOf = (job: QuoteJob, number: string, total: number, deposit?: number) => ({ first: job.first, service: job.service, address: job.street, total: money(total), ...(deposit ? { deposit: money(deposit) } : {}), number, link: quoteLink(number) })

export function Preview({ job, channel, text, subject, lead }: { job: QuoteJob; channel: Channel; text: string; subject: string; lead: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-muted-foreground">What {job.first} will {channel === "text" ? "read" : channel === "email" ? "get" : "read and get"}</p>
      {channel !== "email" && (
        <p data-slot="quote-preview" data-channel="text" className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-stone px-3 py-2">
          {text}
        </p>
      )}
      {channel !== "text" && (
        <div data-slot="quote-preview" data-channel="email" className="rounded-lg border border-border bg-stone p-3">
          <p className="font-semibold">{subject}</p>
          <p className="mt-1 text-muted-foreground">{lead}</p>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------------------------------------ Send a quote

export interface SendQuoteDialogProps {
  job: QuoteJob
  /** the number the quote will have */
  number: string
  onClose: () => void
  /** where the deposit control starts (a story that shows a typed deposit) */
  initial?: { mode: DepositMode; value: string }
  /** `via: "none"` is "Send without notifying": the quote is Sent and no message goes out */
  onSend: (o: { via: Channel | "none"; deposit: { amount: number; percent?: number } | null }) => void
}

export function SendQuoteDialog({ job, number, onClose, onSend, initial }: SendQuoteDialogProps) {
  const total = linesTotal(job.lines)
  const [mode, setMode] = useState<DepositMode>(initial?.mode ?? "none")
  const [value, setValue] = useState(initial?.value ?? "")
  const [channel, setChannel] = useState<Channel>(job.contact === "email" && job.email ? "email" : job.phone ? job.contact : "email")
  const result = depositOf(total, { mode, value })
  const typed = value.trim().length > 0
  const blocked = mode !== "none" && result.amount === null
  const facts = factsOf(job, number, total, result.amount ?? undefined)
  const deposit = result.amount ? `${job.first} pays the ${money(result.amount)} deposit when approving.` : ""
  const sentence = `Send quote ${number} for ${money(total)} to ${job.first} ${channelWords(job, channel)}. ${deposit} The lines are locked until you revise the quote.`.replace("  ", " ")
  const go = (via: Channel | "none") => onSend({ via, deposit: result.amount ? { amount: result.amount, ...(result.percent ? { percent: result.percent } : {}) } : null })
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Send a quote"
      message={sentence}
      size="md"
      slot="send-quote-dialog"
      confirmDisabled={blocked}
      onConfirm={async (v) => (go(v === "quiet" ? "none" : channel), { ok: true })}
      renderConfirm={({ confirm, pending }) => <SplitButton label="Send the quote" onClick={() => confirm("send")} disabled={pending} menuLabel="More ways" menu={[{ label: `Send without telling ${job.first}`, onSelect: () => confirm("quiet") }]} />}
    >
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Deposit</p>
          <SegmentedControl
            label="Deposit"
            value={mode}
            onChange={(v) => {
              setMode(v as DepositMode)
              setValue("")
            }}
            options={[
              { value: "none", label: "None" },
              { value: "dollars", label: "Dollars" },
              { value: "percent", label: "Percent" },
            ]}
          />
          {mode !== "none" && (
            <FormRow label={mode === "dollars" ? "Deposit in dollars" : "Deposit as a percent of the total"} error={typed ? result.problem : ""} hint={result.amount ? `${money(result.amount)} of ${money(total)}. Frozen as dollars when you send.` : `The total is ${money(total)}.`}>
              <Input inputMode="numeric" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "dollars" ? "300" : "25"} />
            </FormRow>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Send by</p>
          <SegmentedControl label="Send by" value={channel} onChange={(v) => setChannel(v as Channel)} options={CHANNEL_OPTIONS(job)} />
        </div>
        <Preview job={job} channel={channel} text={quoteText(facts)} subject={quoteSubject(facts)} lead={quoteLead(facts)} />
      </div>
    </ConfirmDialog>
  )
}

// ------------------------------------------------------------------------------------------------------------------------------ Remind

export interface QuoteReminderDialogProps {
  job: QuoteJob
  quote: QuoteData
  onClose: () => void
  onSend: (o: { via: Channel; line: string }) => void
}

/** "Send a quote reminder": the payment reminder's pattern. Text, Email or Both preselected from the contact preference, a fixed preview, one optional line, no "without notifying" caret. */
export function QuoteReminderDialog({ job, quote, onClose, onSend }: QuoteReminderDialogProps) {
  const [channel, setChannel] = useState<Channel>(job.contact === "email" && job.email ? "email" : job.phone ? job.contact : "email")
  const [line, setLine] = useState("")
  const facts = factsOf(job, quote.id, quote.total, quote.deposit?.amount)
  const add = line.trim()
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Send a quote reminder"
      message={`Send a reminder for quote ${quote.id} to ${job.first} ${channelWords(job, channel)}. Nothing else changes.`}
      confirmLabel="Send the reminder"
      size="md"
      slot="quote-reminder-dialog"
      onConfirm={async () => (onSend({ via: channel, line: add }), { ok: true })}
    >
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Send by</p>
          <SegmentedControl label="Send by" value={channel} onChange={(v) => setChannel(v as Channel)} options={CHANNEL_OPTIONS(job)} />
        </div>
        <Preview job={job} channel={channel} text={`${quoteReminderText(facts)}${add ? ` ${add}` : ""}`} subject={quoteReminderSubject(facts)} lead={`${quoteReminderLead(facts)}${add ? ` ${add}` : ""}`} />
        <FormRow label="Add a line (optional)" hint={`${line.length} of ${REMINDER_LINE_MAX}`}>
          <Textarea value={line} maxLength={REMINDER_LINE_MAX} rows={2} onChange={(e) => setLine(e.target.value)} placeholder="A line after the words, if you want one" />
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}

// ------------------------------------------------------------------------------------------------------------------------------ Revise

export function ReviseDialog({ job, quote, onClose, onRevise }: { job: QuoteJob; quote: QuoteData; onClose: () => void; onRevise: () => void }) {
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Revise this quote?"
      message={`Quote ${quote.id} is marked Replaced and the job goes back to Needs a quote, so its lines can change. Its link will show that it was replaced. Nothing is sent to ${job.first}.`}
      confirmLabel="Revise the quote"
      slot="revise-quote-dialog"
      onConfirm={async () => (onRevise(), { ok: true })}
    />
  )
}

// ------------------------------------------------------------------------------------------------------------------------------ Mark approved by hand

export interface ApproveByHandProps {
  job: QuoteJob
  quote: QuoteData
  onClose: () => void
  /** `tell`: the customer is sent the approval message. A deposit recorded always gets a receipt. */
  onApprove: (o: { deposit?: { how: DepositHow; reference?: string }; tell: boolean }) => void
}

const HOW: { value: DepositHow; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
]

/** Ryan marks the quote approved after a call. With a deposit he says how it was paid (check, cash or Venmo) and a receipt goes out; the customer is told only if he chooses. */
export function ApproveByHandDialog({ job, quote, onClose, onApprove }: ApproveByHandProps) {
  const dep = quote.deposit?.amount
  const [how, setHow] = useState<DepositHow | "">("")
  const [ref, setRef] = useState("")
  const needs = Boolean(dep) && !how
  const refLabel = how === "check" ? "Check number" : how === "venmo" ? "Venmo handle" : ""
  const receipt = dep && how ? ` ${job.first} gets a receipt for the ${money(dep)} by ${job.contact === "email" ? "email" : "text"}.` : ""
  const sentence = dep ? `Mark quote ${quote.id} approved and record the ${money(dep)} deposit${how ? ` paid by ${how}` : ""}.${receipt}` : `Mark quote ${quote.id} approved. No deposit was set.`
  const go = (tell: boolean) => onApprove({ ...(dep && how ? { deposit: { how, ...(ref.trim() ? { reference: ref.trim() } : {}) } } : {}), tell })
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Mark this quote approved"
      message={`${sentence} The job becomes ready to schedule.`}
      size="md"
      slot="approve-by-hand-dialog"
      confirmDisabled={needs}
      onConfirm={async (v) => (go(v !== "quiet"), { ok: true })}
      renderConfirm={({ confirm, pending }) => <SplitButton label={`Mark approved and tell ${job.first}`} onClick={() => confirm("tell")} disabled={pending} menuLabel="More ways" menu={[{ label: `Mark approved without telling ${job.first}`, onSelect: () => confirm("quiet") }]} />}
    >
      {dep ? (
        <div className="flex flex-col gap-3 text-sm">
          <FormRow label={`How was the ${money(dep)} deposit paid?`}>
            <select value={how} onChange={(e) => (setHow(e.target.value as DepositHow | ""), setRef(""))} className={SELECT}>
              <option value="">Choose how it was paid</option>
              {HOW.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </FormRow>
          {refLabel && (
            <FormRow label={`${refLabel} (optional)`}>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" placeholder={how === "check" ? "2210" : "@handle"} />
            </FormRow>
          )}
        </div>
      ) : null}
    </ConfirmDialog>
  )
}

// ------------------------------------------------------------------------------------------------------------------------------ A line

export interface LineDialogProps {
  line?: QuoteLine
  onClose: () => void
  onSave: (line: { name: string; description: string; amount: number }) => void
  onRemove?: () => void
  /** the customer already approved the quote: the lines can still change, a line is canceled rather than removed, and the total moves */
  approved?: boolean
}

/** Add or edit one line of the job: a name, an optional description and a price in whole dollars. After approval the same dialog changes the approved job's lines. */
export function LineDialog({ line, onClose, onSave, onRemove, approved }: LineDialogProps) {
  const [name, setName] = useState(line?.name ?? "")
  const [description, setDescription] = useState(line?.description ?? "")
  const [price, setPrice] = useState(line && line.amount ? String(line.amount) : "")
  const amount = price.trim() === "" ? 0 : Number(price)
  const bad = !Number.isInteger(amount) || amount < 0
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={line ? "Edit the line" : "Add a line"}
      message={approved ? "The customer approved this job. A change here changes its total, and Notes and history records it." : "A line is what the quote charges for. The customer reads its name, its description and its price."}
      confirmLabel={line ? "Save the line" : "Add the line"}
      confirmDisabled={!name.trim() || bad}
      slot="line-dialog"
      onConfirm={async () => (onSave({ name: name.trim(), description: description.trim(), amount }), { ok: true })}
    >
      <div className="flex flex-col gap-3 text-sm">
        <FormRow label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </FormRow>
        <FormRow label="Description (optional)">
          <Textarea value={description} rows={2} onChange={(e) => setDescription(e.target.value)} />
        </FormRow>
        <FormRow label="Price in dollars" error={bad ? "Use whole dollars." : ""} hint="Leave it empty while the line has no price.">
          <Input inputMode="numeric" autoComplete="off" value={price} onChange={(e) => setPrice(e.target.value)} />
        </FormRow>
        {onRemove && (
          <button type="button" onClick={onRemove} className="min-h-11 self-start rounded-sm text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            {approved ? "Cancel this line" : "Remove this line"}
          </button>
        )}
      </div>
    </ConfirmDialog>
  )
}
