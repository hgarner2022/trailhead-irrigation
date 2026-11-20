"use client"

import { useSyncExternalStore } from "react"
import { QUOTE_JOB_FIXTURES, STAGE_PILL, liveQuote, nextNumber, stageOf, type Channel, type DepositHow, type QuoteJob, type QuoteLine, type QuoteState } from "./quote-model"

// The quotes of the prototype: each job's lines and the quotes made on it, held in a small store that a page subscribes to. A story makes its own store (so a
// story that sends a quote never changes another); the walkthrough has one that Start over resets. Every action here is what Ryan's buttons do, and each
// writes the line of Notes and history it would write. Nothing is sent anywhere.

export interface QuoteStore {
  subscribe: (l: () => void) => () => void
  getSnapshot: () => Record<string, QuoteJob>
  getServerSnapshot: () => Record<string, QuoteJob>
  add: (job: QuoteJob) => void
  addLine: (jobId: string, line: Omit<QuoteLine, "id">) => void
  updateLine: (jobId: string, id: string, patch: Partial<Omit<QuoteLine, "id">>) => void
  removeLine: (jobId: string, id: string) => void
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

export function createQuoteStore(initial: readonly QuoteJob[] = QUOTE_JOB_FIXTURES): QuoteStore {
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
    addLine(id, line) {
      set(id, (j) => ((j.lines = [...j.lines, { ...line, id: `l${j.lines.length + 1}-${Date.now() % 100000}` }]), j))
    },
    updateLine(id, lineId, patch) {
      set(id, (j) => ((j.lines = j.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l))), j))
    },
    removeLine(id, lineId) {
      set(id, (j) => ((j.lines = j.lines.filter((l) => l.id !== lineId)), j))
    },
    send(id, o) {
      let number = ""
      set(id, (j) => {
        number = nextNumber(Object.values(jobs))
        const total = j.lines.reduce((s, l) => s + l.amount, 0)
        j.quotes = [...j.quotes, { id: number, jobId: id, lines: structuredClone(j.lines), total, ...(o.deposit ? { deposit: { amount: o.deposit.amount, ...(o.deposit.percent ? { percent: o.deposit.percent } : {}) } } : {}), sentOn: o.at, sentVia: o.via, state: "sent", reminders: [] }]
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
