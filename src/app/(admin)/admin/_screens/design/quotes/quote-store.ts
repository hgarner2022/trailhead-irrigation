"use client"

import { useSyncExternalStore } from "react"
import { QUOTE_HISTORY_FIXTURES } from "./quote-history-fixtures"
import { QUOTES_NOW, QUOTE_JOB_FIXTURES, STAGE_PILL, liveQuote, linesTotal, money, nextNumber, stageOf, type Channel, type DepositHow, type DepositInput, type QuoteJob, type QuoteLine, type QuoteState } from "./quote-model"
import { currentTotal, isApproved, untoldChange, type PriceChange } from "./price-change"

// The quotes of the prototype: each job's lines and the quotes made on it, held in a small store that a page subscribes to. A story makes its own store (so a
// story that sends a quote never changes another); the walkthrough has one that Start over resets. Every action here is what Ryan's buttons do, and each
// writes the line of Notes and history it would write. Nothing is sent anywhere.

export interface QuoteStore {
  subscribe: (l: () => void) => () => void
  getSnapshot: () => Record<string, QuoteJob>
  getServerSnapshot: () => Record<string, QuoteJob>
  add: (job: QuoteJob) => void
  /** Each line edit answers what the customer has not been told when it moved the total of an approved job (`price-change.ts`), else null. `at` is the history's time. */
  addLine: (jobId: string, line: Omit<QuoteLine, "id">, at?: string) => PriceChange | null
  updateLine: (jobId: string, id: string, patch: Partial<Omit<QuoteLine, "id">>, at?: string) => PriceChange | null
  removeLine: (jobId: string, id: string, at?: string) => PriceChange | null
  /** After approval a line is canceled, not removed: struck through, out of the total */
  cancelLine: (jobId: string, id: string, at?: string) => PriceChange | null
  /** The deposit Ryan sets in the quote editor before sending: kept on the job, frozen as dollars by `send` */
  setDeposit: (jobId: string, input: DepositInput) => void
  /** Ryan tells the customer the new total (`via`), or keeps the change without notifying (`none`): either way it is the last step */
  tellPrice: (jobId: string, o: { via: Channel | "none"; at: string }) => void
  send: (jobId: string, o: { via: Channel | "none"; deposit: { amount: number; percent?: number } | null; at: string }) => string
  remind: (jobId: string, o: { via: Channel; at: string }) => void
  revise: (jobId: string, at: string) => void
  approve: (jobId: string, o: { by: "customer" | "Ryan"; deposit?: { how: DepositHow; reference?: string }; at: string }) => void
  decline: (jobId: string, at: string) => void
  refund: (jobId: string, at: string) => void
  cancelJob: (jobId: string, at: string) => void
  reset: () => void
}

const VIA = { text: "text", email: "email", both: "text and email", none: "" }

export function createQuoteStore(initial: readonly QuoteJob[] = [...QUOTE_JOB_FIXTURES, ...QUOTE_HISTORY_FIXTURES]): QuoteStore {
  const seed = () => Object.fromEntries(initial.map((j) => [j.jobId, structuredClone(j)]))
  let jobs: Record<string, QuoteJob> = seed()
  const first = jobs
  const listeners = new Set<() => void>()
  const set = (id: string, change: (j: QuoteJob) => QuoteJob) => {
    const j = jobs[id]
    if (!j) return
    jobs = { ...jobs, [id]: change(structuredClone(j)) }
    listeners.forEach((l) => l())
  }
  const note = (j: QuoteJob, at: string, what: string) => (j.history = [...j.history, { at, actor: "Ryan", what }])
  const live = (j: QuoteJob) => liveQuote(j)
  // A line edit. On an approved job whose total moved, the history says "Price changed from $1,200 to $1,500" and the answer is what the customer has not been told.
  const edit = (id: string, at: string = QUOTES_NOW, change: (j: QuoteJob) => void): PriceChange | null => {
    let out = null as PriceChange | null
    set(id, (j) => {
      const before = currentTotal(j)
      change(j)
      const after = currentTotal(j)
      if (isApproved(j) && before !== after) {
        j.history = [...j.history, { at, actor: "Ryan", what: `Price changed from ${money(before)} to ${money(after)}`, kind: "price-changed", price: { from: before, to: after } }]
        out = untoldChange(j)
      }
      return j
    })
    return out
  }
  return {
    subscribe(l) {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    getSnapshot: () => jobs,
    getServerSnapshot: () => first,
    add(job) {
      jobs = { ...jobs, [job.jobId]: structuredClone(job) }
      listeners.forEach((l) => l())
    },
    addLine: (id, line, at) => edit(id, at, (j) => (j.lines = [...j.lines, { ...line, id: `l${j.lines.length + 1}-${Date.now() % 100000}` }])),
    updateLine: (id, lineId, patch, at) => edit(id, at, (j) => (j.lines = j.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)))),
    removeLine: (id, lineId, at) => edit(id, at, (j) => (j.lines = j.lines.filter((l) => l.id !== lineId))),
    cancelLine: (id, lineId, at) => edit(id, at, (j) => (j.lines = j.lines.map((l) => (l.id === lineId ? { ...l, canceled: true } : l)))),
    setDeposit(id, input) {
      set(id, (j) => ((j.depositDraft = input.mode === "none" ? undefined : input), j))
    },
    tellPrice(id, o) {
      set(id, (j) => {
        const to = currentTotal(j)
        const what = o.via === "none" ? `Kept the new total, ${money(to)}, without notifying ${j.first}` : `Told ${j.first} the new total, ${money(to)}, by ${VIA[o.via]}`
        j.history = [...j.history, { at: o.at, actor: "Ryan", what, kind: "price-told" }]
        return j
      })
    },
    send(id, o) {
      let number = ""
      set(id, (j) => {
        number = nextNumber(Object.values(jobs))
        // a canceled line is not part of the quote: only the lines that count are frozen into it
        const frozen = structuredClone(j.lines.filter((l) => !l.canceled))
        const total = linesTotal(frozen)
        j.depositDraft = undefined
        j.quotes = [...j.quotes, { id: number, jobId: id, lines: frozen, total, ...(o.deposit ? { deposit: { amount: o.deposit.amount, ...(o.deposit.percent ? { percent: o.deposit.percent } : {}) } } : {}), sentOn: o.at, sentVia: o.via, state: "sent", reminders: [] }]
        note(j, o.at, `Sent quote ${number}${o.via === "none" ? " without notifying" : ` by ${VIA[o.via]}`}`)
        return j
      })
      return number
    },
    remind(id, o) {
      set(id, (j) => {
        const q = live(j)
        if (!q || q.state !== "sent") return j
        q.reminders = [...q.reminders, { at: o.at, via: o.via }]
        note(j, o.at, `Sent a reminder for quote ${q.id} by ${VIA[o.via]}`)
        return j
      })
    },
    revise(id, at) {
      set(id, (j) => {
        const q = live(j)
        if (!q || q.state !== "sent") return j
        q.state = "replaced" as QuoteState
        // the replaced quote's deposit is where the next one starts
        if (q.deposit) j.depositDraft = q.deposit.percent ? { mode: "percent", value: String(q.deposit.percent) } : { mode: "dollars", value: String(q.deposit.amount) }
        note(j, at, `Revised quote ${q.id}: it is now Replaced and the job needs a quote`)
        return j
      })
    },
    approve(id, o) {
      set(id, (j) => {
        const q = live(j)
        if (!q || q.state !== "sent") return j
        q.state = "approved"
        q.decidedOn = o.at
        q.decidedBy = o.by
        if (q.deposit && o.deposit) q.deposit.paid = { ...o.deposit, on: o.at }
        j.history = [...j.history, { at: o.at, actor: o.by === "customer" ? j.first : "Ryan", what: o.by === "customer" ? `Approved quote ${q.id}` : `Marked quote ${q.id} approved${q.deposit?.paid ? `, deposit by ${q.deposit.paid.how}` : ""}` }]
        return j
      })
    },
    decline(id, at) {
      set(id, (j) => {
        const q = live(j)
        if (!q || q.state !== "sent") return j
        q.state = "declined"
        q.decidedOn = at
        q.decidedBy = "customer"
        j.history = [...j.history, { at, actor: j.first, what: `Declined quote ${q.id}` }]
        return j
      })
    },
    refund(id, at) {
      set(id, (j) => {
        const q = live(j)
        if (q?.deposit?.paid) {
          q.deposit.paid.refundedOn = at
          note(j, at, `Refunded the $${q.deposit.amount} deposit for quote ${q.id}`)
        }
        return j
      })
    },
    cancelJob(id, at) {
      set(id, (j) => ((j.canceled = true), note(j, at, "Canceled the job"), j))
    },
    reset() {
      jobs = seed()
      listeners.forEach((l) => l())
    },
  }
}

/** The one store of the walkthrough; Start over resets it. */
export const walkQuotes = createQuoteStore()

export function useQuoteJobs(store: QuoteStore = walkQuotes): Record<string, QuoteJob> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
}

export function useQuoteJob(store: QuoteStore, jobId: string): QuoteJob | undefined {
  return useQuoteJobs(store)[jobId]
}

/** The pill a request page shows for the job it became: read from the job's quotes in the walkthrough's store. */
export function useQuoteJobStage(jobId: string | undefined): { status: (typeof STAGE_PILL)["needs-a-quote"]["status"]; label: string } {
  const job = useQuoteJobs()[jobId ?? ""]
  return job ? STAGE_PILL[stageOf(job)] : STAGE_PILL["needs-a-quote"]
}
