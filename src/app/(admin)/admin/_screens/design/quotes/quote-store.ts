"use client"

import { useSyncExternalStore } from "react"
import { ALL_QUOTE_FIXTURES, JOB_FIXTURES, quoteByHand, quoteFromRequest } from "./quote-fixtures"
import { QUOTES_NOW, QUOTE_PILL, jobFromQuote, jobStageOf, linesTotal, money, nextNumber, STAGE_PILL, type ApprovedJob, type Channel, type DepositHow, type DepositInput, type QuoteLine, type QuoteRecord } from "./quote-model"
import { currentTotal, isApproved, untoldChange, type PriceChange } from "./price-change"
import type { QuoteArchiveReason } from "../requests/request-model"

// The quotes of the prototype and the jobs they became (Hannah, Nov 22 2026: a quote is its own record; the job is made only at approval), held in a small store that a
// page subscribes to. A story makes its own store (so a story that sends a quote never changes another); the walkthrough has one that Start over resets. Every action here
// is what Ryan's buttons do, and each writes the line of Notes and history it would write. Approving a quote is the one thing that makes a job: the frozen lines are copied
// once and the deposit payment is attached to the job. Nothing is sent anywhere.

export interface QuoteWorld {
  quotes: Record<string, QuoteRecord>
  jobs: Record<string, ApprovedJob>
}

export interface QuoteStore {
  subscribe: (l: () => void) => () => void
  getSnapshot: () => QuoteWorld
  getServerSnapshot: () => QuoteWorld
  add: (quote: QuoteRecord) => void
  /** A quote made from a request, as Draft: it answers its number. The customer and the service come from the convert sheet. */
  createFromRequest: (o: Omit<Parameters<typeof quoteFromRequest>[0], "id">) => string
  /** A quote made by hand, with no request (New quote), as Draft: it answers its number. */
  createByHand: (o: Omit<Parameters<typeof quoteByHand>[0], "id">) => string
  addLine: (quoteId: string, line: Omit<QuoteLine, "id">) => void
  updateLine: (quoteId: string, id: string, patch: Partial<Omit<QuoteLine, "id">>) => void
  removeLine: (quoteId: string, id: string) => void
  /** Change service, on a Draft: the service line takes the new service's name and price, the notes and the other lines stay, and the history says so */
  changeService: (quoteId: string, o: { name: string; price?: number; at: string }) => void
  /** The deposit Ryan sets in the quote editor before sending: kept on the quote, frozen as dollars by `send` */
  setDeposit: (quoteId: string, input: DepositInput) => void
  /** Sends the Draft: its lines and deposit are frozen into it from this moment. */
  send: (quoteId: string, o: { via: Channel | "none"; deposit: { amount: number; percent?: number } | null; at: string }) => void
  remind: (quoteId: string, o: { via: Channel; at: string }) => void
  /** Revise a Sent quote: it becomes Replaced and the revision is its own quote, a Draft with the same lines and deposit; answers the new number. */
  revise: (quoteId: string, at: string) => string
  /** The customer taps Approve (the deposit paid first), or Ryan marks it approved: THE moment the job is made. Answers the job's id, or null when the quote was not Sent. */
  approve: (quoteId: string, o: { by: "customer" | "Ryan"; deposit?: { how: DepositHow; reference?: string }; at: string }) => string | null
  /** The customer declined: the quote is Declined and no job is made. */
  decline: (quoteId: string, at: string) => void
  /** Archive a Draft, Sent or Declined quote with a reason; the host archives the request it came from with the same reason. */
  archive: (quoteId: string, reason: QuoteArchiveReason, at: string) => void
  // the job made from a quote: a price change after approval stays here, on the job
  /** Each line edit answers what the customer has not been told when it moved the total of the job (`price-change.ts`), else null. `at` is the history's time. */
  addJobLine: (jobId: string, line: Omit<QuoteLine, "id">, at?: string) => PriceChange | null
  updateJobLine: (jobId: string, id: string, patch: Partial<Omit<QuoteLine, "id">>, at?: string) => PriceChange | null
  /** After approval a line is canceled, not removed: struck through, out of the total */
  cancelJobLine: (jobId: string, id: string, at?: string) => PriceChange | null
  /** Ryan tells the customer the new total (`via`), or keeps the change without notifying (`none`): either way it is the last step */
  tellPrice: (jobId: string, o: { via: Channel | "none"; at: string }) => void
  refund: (jobId: string, at: string) => void
  cancelJob: (jobId: string, at: string) => void
  reset: () => void
}

const VIA = { text: "text", email: "email", both: "text and email", none: "" }
const worldOf = (quotes: readonly QuoteRecord[], jobs: readonly ApprovedJob[]): QuoteWorld => ({ quotes: Object.fromEntries(quotes.map((q) => [q.id, structuredClone(q)])), jobs: Object.fromEntries(jobs.map((j) => [j.jobId, structuredClone(j)])) })

export function createQuoteStore(initial: readonly QuoteRecord[] = ALL_QUOTE_FIXTURES, jobs: readonly ApprovedJob[] = initial === ALL_QUOTE_FIXTURES ? JOB_FIXTURES : []): QuoteStore {
  let world = worldOf(initial, jobs)
  const first = world
  const listeners = new Set<() => void>()
  const emit = (next: QuoteWorld) => {
    world = next
    listeners.forEach((l) => l())
  }
  const setQuote = (id: string, change: (q: QuoteRecord) => void) => {
    const q = world.quotes[id]
    if (!q) return
    const copy = structuredClone(q)
    change(copy)
    emit({ ...world, quotes: { ...world.quotes, [id]: copy } })
  }
  const setJob = (id: string, change: (j: ApprovedJob) => void) => {
    const j = world.jobs[id]
    if (!j) return
    const copy = structuredClone(j)
    change(copy)
    emit({ ...world, jobs: { ...world.jobs, [id]: copy } })
  }
  const add = (quote: QuoteRecord) => emit({ ...world, quotes: { ...world.quotes, [quote.id]: structuredClone(quote) } })
  const note = (h: { history: QuoteRecord["history"] }, at: string, what: string) => (h.history = [...h.history, { at, actor: "Ryan", what }])
  // an edit of a Draft's lines: nothing else can change them
  const draft = (id: string, change: (q: QuoteRecord) => void) => setQuote(id, (q) => q.state === "draft" && change(q))
  // A line edit on the job. When the total moved, the history says "Price changed from $1,200 to $1,500" and the answer is what the customer has not been told.
  const edit = (id: string, at: string = QUOTES_NOW, change: (j: ApprovedJob) => void): PriceChange | null => {
    let out = null as PriceChange | null
    setJob(id, (j) => {
      const before = currentTotal(j)
      change(j)
      const after = currentTotal(j)
      if (isApproved(j) && before !== after) {
        j.history = [...j.history, { at, actor: "Ryan", what: `Price changed from ${money(before)} to ${money(after)}`, kind: "price-changed", price: { from: before, to: after } }]
        out = untoldChange(j)
      }
    })
    return out
  }
  return {
    subscribe(l) {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    getSnapshot: () => world,
    getServerSnapshot: () => first,
    add,
    createFromRequest(o) {
      const id = nextNumber(Object.values(world.quotes))
      add(quoteFromRequest({ ...o, id }))
      return id
    },
    createByHand(o) {
      const id = nextNumber(Object.values(world.quotes))
      add(quoteByHand({ ...o, id }))
      return id
    },
    addLine: (id, line) => draft(id, (q) => (q.lines = [...q.lines, { ...line, id: `l${q.lines.length + 1}-${Date.now() % 100000}` }])),
    updateLine: (id, lineId, patch) => draft(id, (q) => (q.lines = q.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)))),
    removeLine: (id, lineId) => draft(id, (q) => (q.lines = q.lines.filter((l) => l.id !== lineId))),
    changeService(id, o) {
      draft(id, (q) => {
        if (q.service === o.name) return
        const old = q.service
        const at = q.lines.findIndex((l) => l.name === old)
        const i = at >= 0 ? at : 0
        const line = { id: q.lines[i]?.id ?? "l1", name: o.name, amount: o.price ?? 0 }
        q.lines = q.lines.length ? q.lines.map((l, n) => (n === i ? line : l)) : [line]
        q.service = o.name
        note(q, o.at, `Service changed from ${old} to ${o.name}`)
      })
    },
    setDeposit(id, input) {
      draft(id, (q) => void (q.depositDraft = input.mode === "none" ? undefined : input))
    },
    send(id, o) {
      setQuote(id, (q) => {
        if (q.state !== "draft") return
        // a canceled line is not part of the quote: only the lines that count are frozen into it
        q.lines = structuredClone(q.lines.filter((l) => !l.canceled))
        q.total = linesTotal(q.lines)
        q.depositDraft = undefined
        if (o.deposit) q.deposit = { amount: o.deposit.amount, ...(o.deposit.percent ? { percent: o.deposit.percent } : {}) }
        q.state = "sent"
        q.sentOn = o.at
        q.sentVia = o.via
        note(q, o.at, `Sent quote ${q.id}${o.via === "none" ? " without notifying" : ` by ${VIA[o.via]}`}`)
      })
    },
    remind(id, o) {
      setQuote(id, (q) => {
        if (q.state !== "sent") return
        q.reminders = [...q.reminders, { at: o.at, via: o.via }]
        note(q, o.at, `Sent a reminder for quote ${q.id} by ${VIA[o.via]}`)
      })
    },
    revise(id, at) {
      const q = world.quotes[id]
      if (!q || q.state !== "sent") return ""
      const number = nextNumber(Object.values(world.quotes))
      const lines = structuredClone(q.lines)
      // the replaced quote's deposit is where the next one starts
      const depositDraft: DepositInput | undefined = q.deposit ? (q.deposit.percent ? { mode: "percent", value: String(q.deposit.percent) } : { mode: "dollars", value: String(q.deposit.amount) }) : undefined
      emit({
        ...world,
        quotes: {
          ...world.quotes,
          [id]: { ...structuredClone(q), state: "replaced", replacedBy: number, history: [...q.history, { at, actor: "Ryan", what: `Revised quote ${id}: it is now Replaced by ${number}` }] },
          [number]: { ...structuredClone(q), id: number, lines, total: 0, deposit: undefined, depositDraft, state: "draft", sentOn: undefined, sentVia: undefined, decidedOn: undefined, decidedBy: undefined, reminders: [], replaces: id, replacedBy: undefined, jobId: undefined, createdOn: at, history: [{ at, actor: "Ryan", what: `Revision of quote ${id}` }] },
        },
      })
      return number
    },
    approve(id, o) {
      const q = world.quotes[id]
      if (!q || q.state !== "sent") return null
      const job = jobFromQuote(q, o)
      const next = structuredClone(q)
      next.state = "approved"
      next.decidedOn = o.at
      next.decidedBy = o.by
      next.jobId = job.jobId
      if (next.deposit && o.deposit) next.deposit.paid = { ...o.deposit, on: o.at }
      const paid = next.deposit?.paid
      next.history = [
        ...next.history,
        { at: o.at, actor: o.by === "customer" ? q.first : "Ryan", what: o.by === "customer" ? `Approved quote ${id}` : `Marked quote ${id} approved${paid ? `, deposit by ${paid.how}` : ""}` },
        { at: o.at, actor: "Ryan", what: `Job created from quote ${id}` },
      ]
      emit({ quotes: { ...world.quotes, [id]: next }, jobs: { ...world.jobs, [job.jobId]: job } })
      return job.jobId
    },
    decline(id, at) {
      setQuote(id, (q) => {
        if (q.state !== "sent") return
        q.state = "declined"
        q.decidedOn = at
        q.decidedBy = "customer"
        q.history = [...q.history, { at, actor: q.first, what: `Declined quote ${q.id}` }]
      })
    },
    archive(id, reason, at) {
      setQuote(id, (q) => {
        if (q.state !== "draft" && q.state !== "sent" && q.state !== "declined") return
        q.state = "archived"
        q.archived = { reason, on: at }
        note(q, at, `Archived quote ${q.id}: ${reason}`)
      })
    },
    addJobLine: (id, line, at) => edit(id, at, (j) => (j.lines = [...j.lines, { ...line, id: `l${j.lines.length + 1}-${Date.now() % 100000}` }])),
    updateJobLine: (id, lineId, patch, at) => edit(id, at, (j) => (j.lines = j.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)))),
    cancelJobLine: (id, lineId, at) => edit(id, at, (j) => (j.lines = j.lines.map((l) => (l.id === lineId ? { ...l, canceled: true } : l)))),
    tellPrice(id, o) {
      setJob(id, (j) => {
        const to = currentTotal(j)
        const what = o.via === "none" ? `Kept the new total, ${money(to)}, without notifying ${j.first}` : `Told ${j.first} the new total, ${money(to)}, by ${VIA[o.via]}`
        j.history = [...j.history, { at: o.at, actor: "Ryan", what, kind: "price-told" }]
      })
    },
    refund(id, at) {
      const j = world.jobs[id]
      if (!j?.deposit?.paid) return
      setJob(id, (job) => {
        job.deposit!.paid!.refundedOn = at
        note(job, at, `Refunded the $${job.deposit!.amount} deposit for quote ${job.quoteId}`)
      })
      setQuote(j.quoteId, (q) => void (q.deposit!.paid!.refundedOn = at))
    },
    cancelJob(id, at) {
      setJob(id, (j) => ((j.canceled = true), note(j, at, "Canceled the job")))
    },
    reset() {
      emit(worldOf(initial, jobs))
    },
  }
}

/** The one store of the walkthrough; Start over resets it. */
export const walkQuotes = createQuoteStore()

export function useQuoteWorld(store: QuoteStore = walkQuotes): QuoteWorld {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
}

export const useQuotes = (store: QuoteStore = walkQuotes) => useQuoteWorld(store).quotes
export const useQuote = (store: QuoteStore, id: string): QuoteRecord | undefined => useQuoteWorld(store).quotes[id]
export const useApprovedJob = (store: QuoteStore, id: string): ApprovedJob | undefined => useQuoteWorld(store).jobs[id]

/** The pill a request page shows for the job it became (Create job): read from the job in the walkthrough's store, Unscheduled when it is not one of the quotes' jobs. */
export function useJobPill(jobId: string | undefined) {
  const job = useQuoteWorld().jobs[jobId ?? ""]
  return job ? STAGE_PILL[jobStageOf(job)] : STAGE_PILL.open
}

/** The pill a request page shows for the quote it became (Send a quote): the quote's own status, Draft when the store does not hold it. */
export function useQuotePill(quoteId: string | undefined) {
  const quote = useQuoteWorld().quotes[quoteId ?? ""]
  return QUOTE_PILL[quote?.state ?? "draft"]
}
