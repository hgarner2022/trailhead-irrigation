"use client"

import { RecordChip } from "@/components/blocks/RecordChip"
import type { GridJob } from "../JobsGridDesign"
import { RequestPage } from "../requests/RequestPage"
import { RequestsList } from "../requests/RequestsList"
import { fullName, matchOf, REQUESTS_NOW, type RequestData } from "../requests/request-model"
import { requestById, requestStore, useRequests } from "../requests/request-store"
import { customerIdOf, registerJob } from "./jobs-data"
import { Placeholder } from "./Placeholder"
import { jobFromRequest } from "../quotes/quote-model"
import { useQuoteJobStage, walkQuotes } from "../quotes/quote-store"

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

