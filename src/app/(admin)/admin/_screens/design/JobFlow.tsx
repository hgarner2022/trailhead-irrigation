"use client"

import { useReducer, useRef, useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { SplitButton } from "@/components/blocks/SplitButton"
import { ToastProvider } from "@/components/blocks/Toast"
import { Button } from "@/components/ui/button"
import type { Message } from "@/lib/admin/types"
import { SchedulePicker, type Pick } from "./SchedulePicker"
import { JobPage } from "./JobPage"
import { reminderBody } from "./confirm-copy"
import { CollectBlock, factsOfJob } from "./JobPageParts"
import { jobPageOf, paidBilling, paymentNote, refundNote, refundedBilling, type JobPageData, type JobState } from "./job-fixtures"

// The clickable job flow (Hannah, Nov 19 2026: "I want a clickable prototype in Storybook that I can go through all this"): JobPage over a
// small reducer and the fixtures, no API. Every button does what it would do: Schedule and Move pick a day and time, On my way confirms and
// makes the job Active, Mark done asks "Done on" and opens How is this paid?, each way of paying confirms and updates Billing and Messages,
// a payment reminder adds a Messages row, Record the payment settles a sent invoice, Cancel job reads Canceled. The strip on top lists the
// steps and where you are. The page itself is the real JobPage; only the data changes.

type Stage = "unscheduled" | "scheduled" | "today" | "active" | "done" | "paid" | "invoice" | "canceled"
interface Flow {
  stage: Stage
  day: string
  time: string
  paidBy?: string
  ref?: string
  report?: boolean
  /** the payment settled an invoice that was out */
  hadInvoice?: boolean
  refunded?: boolean
  extra: Message[]
}
type Act =
  | { type: "reset" }
  | { type: "schedule"; day: string; time: string; text: boolean }
  | { type: "active"; text: boolean }
  | { type: "done" }
  | { type: "paid"; by: string; ref?: string }
  | { type: "invoice"; report: boolean }
  | { type: "refund" }
  | { type: "cancel"; text: boolean }
  | { type: "message"; message: Message }

const START: Flow = { stage: "unscheduled", day: "", time: "Any time", extra: [] }
const FIXTURE: Record<Stage, JobState> = { unscheduled: "unscheduled", scheduled: "scheduled", today: "today", active: "on-the-way", done: "done-unpaid", paid: "done-paid", invoice: "invoice-sent", canceled: "canceled" }
const TODAY = "Today, Wed Nov 18"
const STEPS: [string, Stage[]][] = [["Schedule", ["unscheduled"]], ["Scheduled", ["scheduled"]], ["Today", ["today"]], ["Active", ["active"]], ["Done", ["done"]], ["Billed", ["paid", "invoice"]]]

type Ctx = { ch: Via; inv: { id: string; number: string } }
function reduce(f: Flow, a: Act, c: Ctx): Flow {
  switch (a.type) {
    case "reset": return START
    case "schedule": return { ...f, day: a.day, time: a.time, stage: a.day === TODAY ? "today" : "scheduled", extra: !a.text ? f.extra : [...f.extra, ...sayVia(c.ch, a.day === TODAY ? "day-before" : "date-set", `Trailhead: your repair is ${a.day === TODAY ? "today" : a.day}${a.time === "Any time" ? "" : ` at ${a.time}`}.`)] }
    case "active": return { ...f, stage: "active", extra: a.text ? [...f.extra, ...sayVia(c.ch, "on-the-way", "Trailhead: Ryan is on the way to 480 Briggs St.")] : f.extra }
    case "done": return { ...f, stage: "done" }
    case "refund": return { ...f, refunded: true, extra: [...f.extra, say("email", "note", "Your $145 payment was refunded."), ...(c.ch === "both" || c.ch === "sms" ? [say("sms", "note", "Trailhead: your $145 payment was refunded.")] : [])] }
    case "paid": return { ...f, stage: "paid", paidBy: a.by, ref: a.ref, hadInvoice: f.stage === "invoice", refunded: false, extra: [...f.extra, ...(c.ch !== "sms" ? [say("email", "receipt", "Receipt: $145 for your repair at 480 Briggs St")] : []), ...(c.ch !== "email" ? [say("sms", "receipt", "Trailhead: receipt for $145, your repair at 480 Briggs St.")] : [])] }
    case "invoice": return { ...f, stage: "invoice", report: a.report, extra: [...f.extra, ...sayVia(c.ch, "invoice", `Trailhead: invoice for your repair, $145, due Dec 2. Pay here: trailheadirrigation.com/pay/${c.inv.number}${a.report ? " Your visit report is attached." : ""}`)] }
    case "cancel": return { ...f, stage: "canceled", extra: !a.text ? f.extra : [...f.extra, ...sayVia(c.ch, "visit-cancelled", "Trailhead: your repair is canceled. Nothing was charged.")] }
    case "message": return { ...f, extra: [...f.extra, a.message] }
  }
}

type Via = "sms" | "email" | "both"
let seq = 0
/** A notice in the customer's channel: a text, an email, or both rows. */
function sayVia(via: Via, kind: Message["kind"], body: string): Message[] {
  return [...(via !== "email" ? [say("sms", kind, body)] : []), ...(via !== "sms" ? [say("email", kind, body)] : [])]
}
function say(channel: "email" | "sms", kind: Message["kind"], body: string): Message {
  seq += 1
  return { id: `flow-${seq}`, clientId: "c-1", jobId: "job-1", channel, kind, body, at: new Date(Date.UTC(2026, 10, 18, 17, 0, seq)).toISOString(), status: "delivered" }
}

const PAID_WORD: Record<string, string> = { card: "Card", check: "Check", venmo: "Venmo", cash: "Cash" }

function viewOf(f: Flow, inv: { id: string; number: string }): JobPageData {
  const v = rawView(f)
  if (inv.number === OLD_INV.number) return v
  const re = (t: string) => t.replaceAll(OLD_INV.number, inv.number)
  const link = `/admin/invoices?invoice=${inv.id}`
  return {
    ...v,
    billing: { ...v.billing, paidLine: v.billing.paidLine && { ...v.billing.paidLine, invoice: v.billing.paidLine.invoice && { name: inv.number, href: link } }, invoices: v.billing.invoices?.map((i) => ({ ...i, number: inv.number, href: link })) },
    notes: v.notes.map((n) => ({ ...n, what: re(n.what) })),
    messages: v.messages.map((m) => ({ ...m, body: re(m.body) })),
  }
}

const OLD_INV = { id: "inv-1", number: "INV-2026-0001" }
function rawView(f: Flow): JobPageData {
  const job = jobPageOf(FIXTURE[f.stage])
  const messages = [...f.extra].reverse().concat(f.stage === "unscheduled" ? [] : job.messages.filter((m) => !f.extra.some((x) => x.kind === m.kind)))
  const when = f.day && f.stage !== "done" && f.stage !== "paid" && f.stage !== "invoice" && f.stage !== "canceled" ? job.when.map((r) => (r[0] === "Day" ? ["Day", f.day] : r[0] === "Time" ? ["Time", f.time] : r[0] === "Who" ? ["Who", "Ryan Garner"] : r)) : job.when
  const out: JobPageData = { ...job, when: when as JobPageData["when"], messages: f.stage === "unscheduled" ? f.extra : messages }
  if (f.stage === "paid" && f.paidBy) {
    const by = f.paidBy as "card" | "check" | "venmo" | "cash"
    const rest = (ids: string[]) => jobPageOf("refunded").notes.filter((n) => !ids.includes(n.id))
    if (f.refunded) return { ...jobPageOf("refunded"), messages: out.messages, billing: refundedBilling(by, f.ref), notes: [refundNote(by, f.ref), paymentNote(by, f.ref), ...rest(["n3", "n7"])] }
    out.notes = [paymentNote(by, f.ref), ...job.notes.filter((n) => n.id !== "n3")]
    out.pills = [{ status: "done" }, { status: "paid", label: `Paid, ${PAID_WORD[by]}` }]
    out.billing = paidBilling(by, f.ref, f.hadInvoice)
  }
  if (f.stage === "invoice") out.billing = { ...job.billing, invoices: job.billing.invoices?.map((i) => ({ ...i, note: f.report === false ? undefined : "Includes the visit report" })) }
  return out
}

function Strip({ stage, onReset, embedded }: { stage: Stage; onReset: () => void; embedded?: boolean }) {
  const at = stage === "canceled" ? -1 : STEPS.findIndex(([, s]) => s.includes(stage))
  return (
    <nav aria-label="Flow" data-slot="flow-strip" className="mx-auto mb-4 flex max-w-6xl flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <span className="font-semibold text-navy">Flow</span>
      <ol className="flex flex-1 flex-wrap items-center gap-2">
        {STEPS.map(([name], i) => (
          <li key={name} aria-current={i === at ? "step" : undefined} className={i === at ? "rounded-full bg-navy px-3 py-1 font-medium text-white" : i < at ? "rounded-full bg-stone px-3 py-1 text-foreground" : "rounded-full px-3 py-1 text-muted-foreground"}>
            {i + 1}. {name}
          </li>
        ))}
        {stage === "canceled" && <li className="rounded-full bg-stone px-3 py-1 font-medium">Canceled</li>}
      </ol>
      {!embedded && <Button type="button" variant="outline" className="min-h-11" onClick={onReset}>Start over</Button>}
    </nav>
  )
}

type Ask = "schedule" | null

export function JobFlow({ channel = "text", embedded = false, invoice = OLD_INV }: { channel?: "text" | "email" | "both"; /** inside a walkthrough: its own strip has the one Start over */ embedded?: boolean; /** the invoice the flow sends: the walkthrough passes the one in its Invoices list */ invoice?: { id: string; number: string } }) {
  const via: Via = channel === "both" ? "both" : channel === "email" ? "email" : "sms"
  const pageChannel = channel === "email" ? "email" : "text"
  const [f, dispatch] = useReducer((state: Flow, act: Act) => reduce(state, act, { ch: via, inv: invoice }), START)
  const [ask, setAsk] = useState<Ask>(null)
  const [pick, setPick] = useState<Pick>({ day: "Tue, Nov 24", time: "Any time", person: "Ryan Garner" })
  const [collecting, setCollecting] = useState(false)
  const view = viewOf(f, invoice)
  const handlers = {
    onCharge: async () => ({ ok: true as const }),
    onRecord: async ({ method, reference }: { method: string; reference?: string }) => (paying.current = { by: method, ref: reference }, { ok: true as const }),
    onInvoice: async (o?: { report: boolean }) => (invoiceReport.current = o?.report ?? true, { ok: true as const }),
    onClose: () => setCollecting(false),
    onLater: () => setCollecting(false),
    onDone: () => (setCollecting(false), flush()),
  }
  const paying = useRef<{ by: string; ref?: string } | null>(null)
  const invoiceReport = useRef<boolean | null>(null)
  const onDo = (label: string, variant?: string, how?: string) => {
    if (label === "Schedule" || label === "Move") { setPick({ day: "Tue, Nov 24", time: "Any time", person: "Ryan Garner" }); setAsk("schedule") }
    else if (label === "Mark done") (dispatch({ type: "done" }), setCollecting(true))
    else if (label === "Refund $145") dispatch({ type: "refund" })
    else if (label === "On my way") dispatch({ type: "active", text: variant !== "quiet" })
    else if (label === "Delete job") dispatch({ type: "reset" })
    else if (label === "Cancel job") dispatch({ type: "cancel", text: variant !== "quiet" })
    else if (label === "Send a payment reminder") {
      const via2: Via = how === "both" ? "both" : how === "email" ? "email" : how === "text" ? "sms" : via
      const facts = { amount: "$145", service: "repair", dueOn: "Dec 2", line: variant, number: invoice.number }
      const who = { first: "Andrea", phone: "(970) 555-0123", email: "andrea.dalton@example.com" }
      for (const ch of via2 === "both" ? (["sms", "email"] as const) : ([via2] as const)) dispatch({ type: "message", message: say(ch, "invoice-reminder", reminderBody({ ...who, channel: ch === "sms" ? "text" : "email" }, facts)) })
    }
  }
  return (
    <ToastProvider>
      <Strip embedded={embedded} stage={f.stage} onReset={() => dispatch({ type: "reset" })} />
      <JobPage
        job={{ ...view, contact: { channel: pageChannel, email: "andrea.dalton@example.com" } }}
        onDo={onDo}
        intercept={["Schedule", "Move"]}
        onMessage={(m) => dispatch({ type: "message", message: say(m.channel === "text" ? "sms" : "email", "note", m.body) })}
        handlers={handlers}
      />
      {ask === "schedule" && (
        <ConfirmDialog
          open
          size="md"
          onOpenChange={(o) => !o && setAsk(null)}
          title={f.stage === "unscheduled" ? "Schedule the job" : "Move the job"}
          slot="flow-schedule"
          onConfirm={async (variant) => (dispatch({ type: "schedule", day: pick.day, time: pick.time, text: variant !== "quiet" }), { ok: true })}
          renderConfirm={({ confirm, pending }) => {
            const verb = f.stage === "unscheduled" ? "Schedule" : "Move"
            return <SplitButton label={`${verb} and notify the customer`} onClick={() => confirm("text")} disabled={pending} menuLabel={`More ways to ${verb.toLowerCase()}`} menu={[{ label: `${verb} without notifying`, disabled: pick.time !== "Any time", onSelect: () => confirm("quiet") }]} />
          }}
        >
          <SchedulePicker firstName={view.customer.split(" ")[0]!} channel={pageChannel} onChange={setPick} />
        </ConfirmDialog>
      )}
      {collecting && f.stage === "done" && view.collect && (
        <ConfirmDialog open onOpenChange={(o) => !o && setCollecting(false)} title="How is this paid?" actions="none" size="md" slot="flow-collect">
          <CollectBlock bare collect={view.collect} facts={factsOfJob(view)} handlers={{ ...handlers, onClose: handlers.onClose }} />
        </ConfirmDialog>
      )}
    </ToastProvider>
  )

  // CollectPayment settles first and toasts; the page takes the answer as the dialog closes and shows it in Billing.
  function flush() {
    if (invoiceReport.current !== null) dispatch({ type: "invoice", report: invoiceReport.current })
    else if (paying.current) dispatch({ type: "paid", by: paying.current.by, ref: paying.current.ref })
    else dispatch({ type: "paid", by: "card" })
    invoiceReport.current = null
    paying.current = null
  }
}
