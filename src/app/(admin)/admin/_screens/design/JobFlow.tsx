"use client"

import { useReducer, useRef, useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { Button } from "@/components/ui/button"
import type { Message } from "@/lib/admin/types"
import { JobPage } from "./JobPage"
import { jobPageOf, type JobPageData, type JobState } from "./job-fixtures"

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
  extra: Message[]
}
type Act =
  | { type: "reset" }
  | { type: "schedule"; day: string; time: string }
  | { type: "active"; text: boolean }
  | { type: "done" }
  | { type: "paid"; by: string; ref?: string }
  | { type: "invoice"; report: boolean }
  | { type: "cancel" }
  | { type: "message"; message: Message }

const START: Flow = { stage: "unscheduled", day: "", time: "Any time", extra: [] }
const FIXTURE: Record<Stage, JobState> = { unscheduled: "unscheduled", scheduled: "scheduled", today: "today", active: "on-the-way", done: "done-unpaid", paid: "done-paid", invoice: "invoice-sent", canceled: "canceled" }
const TODAY = "Today, Wed Nov 18"
const DAYS = [TODAY, "Tue, Nov 24", "Wed, Nov 25"]
const TIMES = ["Any time", "8:00 am", "9:00 am", "1:00 pm"]
const STEPS: [string, Stage[]][] = [["Schedule", ["unscheduled"]], ["Scheduled", ["scheduled"]], ["Today", ["today"]], ["Active", ["active"]], ["Done", ["done"]], ["Billed", ["paid", "invoice"]]]

function reduce(f: Flow, a: Act): Flow {
  switch (a.type) {
    case "reset": return START
    case "schedule": return { ...f, day: a.day, time: a.time, stage: a.day === TODAY ? "today" : "scheduled", extra: [...f.extra, say("sms", a.day === TODAY ? "day-before" : "date-set", `Trailhead: your repair is ${a.day === TODAY ? "today" : a.day}${a.time === "Any time" ? "" : ` at ${a.time}`}.`)] }
    case "active": return { ...f, stage: "active", extra: a.text ? [...f.extra, say("sms", "on-the-way", "Trailhead: Ryan is on the way to 480 Briggs St.")] : f.extra }
    case "done": return { ...f, stage: "done" }
    case "paid": return { ...f, stage: "paid", paidBy: a.by, ref: a.ref, extra: [...f.extra, say("email", "receipt", "Receipt: $145 for your repair at 480 Briggs St")] }
    case "invoice": return { ...f, stage: "invoice", report: a.report, extra: [...f.extra, say("sms", "invoice", `Trailhead: invoice for your repair, $145, due Dec 2. Pay here: trailheadirrigation.com/pay/1042${a.report ? " Your visit report is attached." : ""}`)] }
    case "cancel": return { ...f, stage: "canceled", extra: [...f.extra, say("sms", "visit-cancelled", "Trailhead: your repair is canceled. Nothing was charged.")] }
    case "message": return { ...f, extra: [...f.extra, a.message] }
  }
}

let seq = 0
function say(channel: "email" | "sms", kind: Message["kind"], body: string): Message {
  seq += 1
  return { id: `flow-${seq}`, clientId: "c-1", jobId: "job-1", channel, kind, body, at: new Date(Date.UTC(2026, 10, 18, 17, 0, seq)).toISOString(), status: "delivered" }
}

const methodLabel = (by: string, ref?: string) => (by === "card" ? "Visa ending 4242" : by === "check" ? `Check${ref ? ` ${ref}` : ""}` : by[0]!.toUpperCase() + by.slice(1))

function viewOf(f: Flow): JobPageData {
  const job = jobPageOf(FIXTURE[f.stage])
  const messages = [...f.extra].reverse().concat(f.stage === "unscheduled" ? [] : job.messages.filter((m) => !f.extra.some((x) => x.kind === m.kind)))
  const when = f.day && f.stage !== "done" && f.stage !== "paid" && f.stage !== "invoice" && f.stage !== "canceled" ? job.when.map((r) => (r[0] === "Day" ? ["Day", f.day] : r[0] === "Time" ? ["Time", f.time] : r[0] === "Who" ? ["Who", "Ryan Garner"] : r)) : job.when
  const out: JobPageData = { ...job, when: when as JobPageData["when"], messages: f.stage === "unscheduled" ? f.extra : messages }
  if (f.stage === "paid" && f.paidBy) {
    const how = methodLabel(f.paidBy, f.ref)
    out.pills = [{ status: "done" }, { status: "paid", label: `Paid, ${f.paidBy === "card" ? "Card" : how}` }]
    out.billing = { ...job.billing, rows: [{ id: "p1", kind: "payment", title: how, detail: `Nov 18${f.ref && f.paidBy !== "check" ? ` · ${f.ref}` : ""}`, amount: "$145" }] }
  }
  if (f.stage === "invoice") out.billing = { ...job.billing, rows: [{ ...job.billing.rows[0]!, detail: `Invoice sent Nov 18. Pay link: trailheadirrigation.com/pay/1042.${f.report ? " Includes the visit report." : ""}` }] }
  return out
}

function Strip({ stage, onReset }: { stage: Stage; onReset: () => void }) {
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
      <Button type="button" variant="outline" className="min-h-11" onClick={onReset}>Start over</Button>
    </nav>
  )
}

type Ask = "schedule" | "done" | "record" | null

export function JobFlow() {
  const [f, dispatch] = useReducer(reduce, START)
  const [ask, setAsk] = useState<Ask>(null)
  const [day, setDay] = useState(DAYS[1]!)
  const [time, setTime] = useState(TIMES[0]!)
  const [doneOn, setDoneOn] = useState(TODAY)
  const [check, setCheck] = useState("1042")
  const view = viewOf(f)
  const paying = useRef<{ by: string; ref?: string } | null>(null)
  const invoiceReport = useRef<boolean | null>(null)
  const onDo = (label: string) => {
    if (label === "Schedule" || label === "Move") { setDay(f.day || DAYS[1]!); setAsk("schedule") }
    else if (label === "Mark done") setAsk("done")
    else if (label === "Record the payment") setAsk("record")
    else if (label === "On my way") dispatch({ type: "active", text: true })
    else if (label === "Start without texting") dispatch({ type: "active", text: false })
    else if (label === "Cancel job") dispatch({ type: "cancel" })
    else if (label === "Send a payment reminder") dispatch({ type: "message", message: say("sms", "invoice-reminder", "Trailhead: a reminder that your $145 invoice for the repair is due Dec 2. Pay here: trailheadirrigation.com/pay/1042") })
  }
  return (
    <>
      <Strip stage={f.stage} onReset={() => dispatch({ type: "reset" })} />
      <JobPage
        job={view}
        onDo={onDo}
        intercept={["Schedule", "Move", "Mark done", "Record the payment"]}
        handlers={{
          onCharge: async () => ({ ok: true }),
          onRecord: async ({ method, reference }) => (setPending({ by: method, ref: reference }), { ok: true }),
          onInvoice: async (o) => (setPendingInvoice(o?.report ?? true), { ok: true }),
          onClose: () => flush(),
        }}
      />
      {ask === "schedule" && (
        <ConfirmDialog open onOpenChange={(o) => !o && setAsk(null)} title={f.stage === "unscheduled" ? "Schedule the job" : "Move the job"} message={`Set the day and time. ${view.customer.split(" ")[0]} gets a text with the new day.`} confirmLabel="Save and text" slot="flow-schedule" onConfirm={async () => (dispatch({ type: "schedule", day, time }), { ok: true })}>
          <div className="flex flex-col gap-3">
            <FormRow label="Day"><select value={day} onChange={(e) => setDay(e.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm">{DAYS.map((d) => <option key={d}>{d}</option>)}</select></FormRow>
            <FormRow label="Time"><select value={time} onChange={(e) => setTime(e.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm">{TIMES.map((t) => <option key={t}>{t}</option>)}</select></FormRow>
          </div>
        </ConfirmDialog>
      )}
      {ask === "done" && (
        <ConfirmDialog open onOpenChange={(o) => !o && setAsk(null)} title="Mark done" message="Nothing is charged and no one is texted. Next you choose how it is paid." confirmLabel="Mark done" slot="flow-done" onConfirm={async () => (dispatch({ type: "done" }), setDoneOn(TODAY), { ok: true })}>
          <FormRow label="Done on"><select value={doneOn} onChange={(e) => setDoneOn(e.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm">{[TODAY, "Mon, Nov 16"].map((d) => <option key={d}>{d}</option>)}</select></FormRow>
        </ConfirmDialog>
      )}
      {ask === "record" && (
        <ConfirmDialog open onOpenChange={(o) => !o && setAsk(null)} title="Record the payment" message={`Record a $145 check, number ${check}, for invoice INV-2026-0001. Andrea gets a receipt by email and the pay link closes.`} confirmLabel="Record the payment" slot="flow-record" onConfirm={async () => (dispatch({ type: "paid", by: "check", ref: `#${check}` }), { ok: true })}>
          <FormRow label="Check number"><input value={check} onChange={(e) => setCheck(e.target.value)} className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm" /></FormRow>
        </ConfirmDialog>
      )}
    </>
  )

  // CollectPayment settles first and shows its own result; the page takes the answer when that panel is closed.
  function flush() {
    if (invoiceReport.current !== null) dispatch({ type: "invoice", report: invoiceReport.current })
    else if (paying.current) dispatch({ type: "paid", by: paying.current.by, ref: paying.current.ref })
    else dispatch({ type: "paid", by: "card" })
    invoiceReport.current = null
    paying.current = null
  }
  function setPending(p: { by: string; ref?: string }) { paying.current = p }
  function setPendingInvoice(r: boolean) { invoiceReport.current = r }
}
