"use client"

import { RecordChip } from "@/components/blocks/RecordChip"
import { RequestRows, requestRowsOf, type RequestRow } from "@/components/blocks/RequestRows"
import { useToast } from "@/components/blocks/Toast"
import { useState } from "react"
import type { GridJob } from "../JobsGridDesign"
import { RequestPage } from "../requests/RequestPage"
import { RequestsList } from "../requests/RequestsList"
import { fullName, matchOf, REQUESTS_NOW, stateOf, type RequestData } from "../requests/request-model"
import { requestById, requestStore, useRequests } from "../requests/request-store"
import { customerIdOf, registerJob } from "./jobs-data"
import { Placeholder } from "./Placeholder"
import { QuoteReminderDialog } from "../quotes/QuoteDialogs"
import { jobFromRequest, liveQuote, money, QUOTES_NOW, VIA_WORDS } from "../quotes/quote-model"
import { useQuoteJobs, useQuoteJobStage, walkQuotes } from "../quotes/quote-store"

// The Requests screens of the walkthrough: the list and a request's page over the request store, so what Ryan does (opens, accepts, archives) shows in
// the rail's badge, the list, Home and Cmd+K, and what the customer walkthrough sent from the booking form is in the list. Accept makes a job row in
// Needs a quote, which the Jobs grid lists; the customer is the match or, for a new person, a customer made here.

/** What Accept does in the prototype: the customer the job goes under (the match, or a new one), and a Needs a quote job in the Jobs grid. */
export function acceptRequest(request: RequestData, o: { asNew: boolean }): { jobId: string; customerId: string } {
  const match = matchOf(request)
  const name = fullName(request)
  const customerId = match && !o.asNew ? match.customer.id : customerIdOf(name)
  const jobId = `q-${request.id.replace(/^rq-/, "")}`
  const service = request.service || "Job"
  const row: GridJob = {
    id: jobId,
    name: match && !o.asNew ? match.customer.name : name,
    service,
    title: service,
    property: request.street ? `${request.street}, ${request.town}` : "",
    stage: "needs-a-quote",
    who: "No one yet",
    season: "",
    visits: "0 of 1 done",
    total: 0,
    billingState: null,
    billing: "",
    next: "Unscheduled",
  }
  registerJob(row)
  walkQuotes.add(jobFromRequest({ jobId, requestId: request.id, customerId, customer: row.name, first: request.first, phone: request.phone, email: request.email, contact: request.contact, service: request.service, street: request.street, town: request.town, words: request.words, at: REQUESTS_NOW }))
  requestStore.accept(request.id, { jobId, customerId, at: REQUESTS_NOW })
  return { jobId, customerId }
}

export function RequestsRoute({ filter, onOpen }: { filter?: "new"; onOpen: (id: string) => void }) {
  const list = useRequests()
  return <RequestsList key={filter ?? "all"} requests={list} now={REQUESTS_NOW} onOpen={(r) => onOpen(r.id)} defaultFilters={filter === "new" ? [{ column: "state", values: ["new"] }] : undefined} />
}

export function RequestRoute({ id }: { id: string }) {
  const list = useRequests()
  const request = requestById(list, id)
  const stage = useQuoteJobStage(request?.accepted?.jobId)
  if (!request) {
    return (
      <Placeholder title="Not in this prototype" line="That request is not in the prototype's world. Requests has every one that opens.">
        <RecordChip kind="request" name="Back to Requests" href="/admin/requests" />
      </Placeholder>
    )
  }
  return <RequestPage key={id} request={request} now={REQUESTS_NOW} jobStage={stage} onSeen={(r) => requestStore.markSeen(r.id)} onAccept={(r, o) => acceptRequest(r, o)} onArchive={(r, reason) => requestStore.archive(r.id, reason, REQUESTS_NOW)} />
}


/** Home's Needs action rows in the walkthrough: the new requests, each quote waiting with its age and Remind, and a decided quote, read from the two stores. */
export function HomeRequestRows() {
  const requests = useRequests()
  const jobs = useQuoteJobs()
  const toast = useToast()
  const [reminding, setReminding] = useState<string | null>(null)
  const quotes = Object.values(jobs).flatMap((j): Extract<RequestRow, { kind: "quote-waiting" | "quote-decided" }>[] => {
    const q = liveQuote(j)
    if (!q || j.canceled) return []
    if (q.state === "sent") {
      const last = q.reminders[q.reminders.length - 1]
      return [{ kind: "quote-waiting", id: q.id, jobId: j.jobId, customer: j.customer, service: j.service, amount: money(q.total), sentAt: q.sentOn, ...(last ? { remindedAt: last.at, remindedToday: last.at.slice(0, 10) === QUOTES_NOW.slice(0, 10) } : {}) }]
    }
    return q.state === "approved" || q.state === "declined" ? [{ kind: "quote-decided", id: q.id, jobId: j.jobId, customer: j.customer, outcome: q.state, amount: money(q.total), at: q.decidedOn ?? q.sentOn }] : []
  })
  const rows = requestRowsOf({ requests: requests.map((r) => ({ receivedAt: r.receivedAt, isNew: stateOf(r) === "new" })), quotes })
  const job = reminding ? Object.values(jobs).find((j) => liveQuote(j)?.id === reminding) : undefined
  const q = job && liveQuote(job)
  return (
    <>
      <RequestRows rows={rows} now={REQUESTS_NOW} onRemind={(row) => setReminding(row.id)} className="border-b border-border" />
      {job && q && (
        <QuoteReminderDialog
          job={job}
          quote={q}
          onClose={() => setReminding(null)}
          onSend={({ via }) => {
            walkQuotes.remind(job.jobId, { via, at: QUOTES_NOW })
            toast(`Reminder sent to ${job.first} by ${VIA_WORDS[via]}`)
          }}
        />
      )}
    </>
  )
}
