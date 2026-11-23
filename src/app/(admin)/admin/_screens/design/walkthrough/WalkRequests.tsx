"use client"

import { RecordChip } from "@/components/blocks/RecordChip"
import { recordHref } from "@/components/blocks/record-preview-model"
import { RequestRows, requestRowsOf, type RequestRow } from "@/components/blocks/RequestRows"
import { useToast } from "@/components/blocks/Toast"
import { useState } from "react"
import type { GridJob } from "../JobsGridDesign"
import { RequestPage } from "../requests/RequestPage"
import { RequestsList } from "../requests/RequestsList"
import { fullName, matchOf, openRequests, REQUESTS_NOW, stateOf, type RequestData } from "../requests/request-model"
import { requestById, requestStore, useRequests } from "../requests/request-store"
import { customerIdOf, registerJob } from "./jobs-data"
import { Placeholder } from "./Placeholder"
import { registerWorldCustomer } from "./world-customers"
import { QuoteReminderDialog } from "../quotes/QuoteDialogs"
import { money, QUOTES_NOW, VIA_WORDS } from "../quotes/quote-model"
import { useJobPill, useQuotePill, useQuoteWorld, walkQuotes } from "../quotes/quote-store"

// The Requests screens of the walkthrough: the list and a request's page over the request store, so what Ryan does (opens, makes a quote or a job, archives) shows in
// the rail's badge, the list, Home and Cmd+K, and what the customer walkthrough sent from the booking form is in the list. Hannah, Nov 20 2026: the request MOVES into
// what it became. Nov 22 2026: Send a quote makes the customer and a QUOTE in Draft (never a job, and the job is made when the quote is approved) and lands on the quote's
// page; Create job, offered for a priced service, still makes a job at once, ready to schedule. Either way the request leaves the list, unless its quote is archived:
// then the request is back, Archived, with the quote's reason.

/** The step a quote's page opens with when Ryan lands on it from a request or from New quote: price the line (an unpriced quote) or Send a quote. */
const landing = new Map<string, "send" | "price">()
export const takeLanding = (id: string) => {
  const d = landing.get(id)
  landing.delete(id)
  return d
}
export const setLanding = (id: string, d: "send" | "price") => void landing.set(id, d)

/** What Create job and Send a quote do in the prototype: the customer it goes under (the match, or a new one who joins the world), then a job in the Jobs grid (Create job) or a Draft quote in the quote store (Send a quote), and the request moved into it. Answers the job's or the quote's id. */
export function createJobFromRequest(request: RequestData, o: { asNew: boolean; mode: "job" | "quote"; service: { name: string; price?: number } }): { id: string; customerId: string } {
  const match = matchOf(request)
  const name = fullName(request)
  const known = match && !o.asNew
  const customerId = known ? match.customer.id : customerIdOf(name)
  const customer = known ? match.customer.name : name
  const service = o.service.name
  const { price } = o.service
  if (!known) registerWorldCustomer(customerId, { name, phone: request.phone, email: request.email, channel: request.email && !request.phone ? "email" : "text", street: request.street, town: request.town, since: "2026-11-18" })
  if (o.mode === "quote") {
    const id = walkQuotes.createFromRequest({ requestId: request.id, customerId, customer, first: request.first, phone: request.phone, email: request.email, contact: request.contact === "email" ? "email" : "text", service, street: request.street, town: request.town, words: request.words, receivedAt: request.receivedAt, at: REQUESTS_NOW, price })
    setLanding(id, price ? "send" : "price")
    requestStore.becomeQuote(request.id, { quoteId: id, customerId, at: REQUESTS_NOW })
    return { id, customerId }
  }
  const jobId = `rj-${request.id.replace(/^rq-/, "")}`
  const row: GridJob = { id: jobId, name: customer, service, title: service, property: request.street ? `${request.street}, ${request.town}` : "", stage: "unscheduled", who: "No one yet", season: "", visits: "0 of 1 done", total: price ?? 0, billingState: null, billing: "", next: "Unscheduled" }
  registerJob(row)
  requestStore.becomeJob(request.id, { jobId, customerId, at: REQUESTS_NOW })
  return { id: jobId, customerId }
}

export function RequestsRoute({ filter, onOpen }: { filter?: "new"; onOpen: (id: string) => void }) {
  const list = useRequests()
  return <RequestsList key={filter ?? "all"} requests={list} now={REQUESTS_NOW} onOpen={(r) => onOpen(r.id)} defaultFilters={filter === "new" ? [{ column: "state", values: ["new"] }] : undefined} />
}

export function RequestRoute({ id, onJobCreated }: { id: string; onJobCreated?: (id: string, message: string, mode: "job" | "quote") => void }) {
  const list = useRequests()
  const request = requestById(list, id)
  const jobStage = useJobPill(request?.becameJob?.jobId)
  const quoteStage = useQuotePill(request?.becameQuote?.quoteId)
  if (!request) {
    return (
      <Placeholder title="Not in this prototype" line="That request is not in the prototype's world. Requests has every one that opens.">
        <RecordChip kind="request" name="Back to Requests" href="/admin/requests" />
      </Placeholder>
    )
  }
  return <RequestPage key={id} request={request} now={REQUESTS_NOW} jobStage={jobStage} quoteStage={quoteStage} onSeen={(r) => requestStore.markSeen(r.id)} onCreateJob={(r, o) => createJobFromRequest(r, o)} onJobCreated={onJobCreated} onArchive={(r, reason) => requestStore.archive(r.id, reason, REQUESTS_NOW)} />
}

/** Home's Needs action rows in the walkthrough: the new requests, each quote waiting with its age and Remind, and a decided quote, read from the two stores. */
export function HomeRequestRows() {
  const requests = useRequests()
  const { quotes: all } = useQuoteWorld()
  const toast = useToast()
  const [reminding, setReminding] = useState<string | null>(null)
  const quotes = Object.values(all).flatMap((q): Extract<RequestRow, { kind: "quote-waiting" | "quote-decided" }>[] => {
    if (q.state === "sent") {
      const last = q.reminders[q.reminders.length - 1]
      return [{ kind: "quote-waiting", id: q.id, jobId: "", customer: q.customer, service: q.service, amount: money(q.total), sentAt: q.sentOn!, ...(last ? { remindedAt: last.at, remindedToday: last.at.slice(0, 10) === QUOTES_NOW.slice(0, 10) } : {}) }]
    }
    // an approved quote opens the job it made; a declined one has no job, so it opens the quote
    if (q.state === "approved") return [{ kind: "quote-decided", id: q.id, jobId: q.jobId ?? "", customer: q.customer, outcome: "approved", amount: money(q.total), at: q.decidedOn ?? q.sentOn! }]
    return q.state === "declined" ? [{ kind: "quote-decided", id: q.id, jobId: "", href: recordHref.quote(q.id), customer: q.customer, outcome: "declined", amount: money(q.total), at: q.decidedOn ?? q.sentOn! }] : []
  })
  const rows = requestRowsOf({ requests: openRequests(requests).map((r) => ({ receivedAt: r.receivedAt, isNew: stateOf(r) === "new" })), quotes })
  const q = reminding ? all[reminding] : undefined
  return (
    <>
      <RequestRows rows={rows} now={REQUESTS_NOW} onRemind={(row) => setReminding(row.id)} className="border-b border-border" />
      {q && (
        <QuoteReminderDialog
          quote={q}
          onClose={() => setReminding(null)}
          onSend={({ via }) => {
            walkQuotes.remind(q.id, { via, at: QUOTES_NOW })
            toast(`Reminder sent to ${q.first} by ${VIA_WORDS[via]}`)
          }}
        />
      )}
    </>
  )
}
