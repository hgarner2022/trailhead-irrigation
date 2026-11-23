"use client"

import { useState } from "react"
import { RecordChip } from "@/components/blocks/RecordChip"
import { useToast } from "@/components/blocks/Toast"
import type { CustomerChoice } from "../../CustomerPicker"
import { ApprovedJobPage } from "../quotes/ApprovedJobPage"
import { NewQuoteSheet } from "../quotes/NewQuoteSheet"
import { QuotePage } from "../quotes/QuotePage"
import { QuotesList } from "../quotes/QuotesList"
import { QUOTES_NOW, VIA_WORDS } from "../quotes/quote-model"
import { useQuoteWorld, walkQuotes } from "../quotes/quote-store"
import type { ServicePick } from "../requests/request-catalogue"
import { REQUESTS_NOW } from "../requests/request-model"
import { requestStore, useRequests } from "../requests/request-store"
import { Placeholder } from "./Placeholder"
import { takeLanding, setLanding } from "./WalkRequests"
import { partyOfChoice, WALK_DATA } from "./walk-new-job"

// A quote and the job it becomes, in the walkthrough (Hannah, Nov 22 2026: a quote is its own record and a job is made only when it is approved): the Quotes list, a quote's own page and,
// once a quote is approved, the page of the job it made, all over the walkthrough's one quote store, so making, sending, reminding, revising, approving and archiving here show in the Quotes
// list, the rail's count, Home, the customer's page and (for an approved one) the Jobs grid. Arriving from a request (Send a quote) or from New quote, the page leads with the Quote editor
// and the cursor is in the first empty price box: Ryan prices the line there, then presses Send a quote. The request's photos come along to the quote.

/** The Quotes list over the walkthrough's one quote store: a quote made anywhere is a row here at once, and Remind uses the quote's own dialog. */
export function QuotesRoute({ filter, onNewQuote }: { filter?: "sent"; onNewQuote: () => void }) {
  const { quotes } = useQuoteWorld()
  const toast = useToast()
  return (
    <QuotesList
      key={filter ?? "all"}
      quotes={Object.values(quotes)}
      now={QUOTES_NOW}
      initialTab={filter === "sent" ? "sent" : undefined}
      onNewQuote={onNewQuote}
      onRemind={(quote, { via }) => {
        walkQuotes.remind(quote.id, { via, at: QUOTES_NOW })
        toast(`Reminder sent to ${quote.first} by ${VIA_WORDS[via]}`)
      }}
    />
  )
}

const NotInWorld = ({ what, back }: { what: string; back: { name: string; href: string; kind: "job" | "quote" } }) => (
  <Placeholder title="Not in this prototype" line={`${what} is not in the prototype's world. ${back.name} has every record that opens.`}>
    <RecordChip kind={back.kind} name={`Back to ${back.name}`} href={back.href} />
  </Placeholder>
)

/** A quote's page. Archiving it archives the request it came from, with the same reason: the request store is told here. */
export function QuoteRoute({ id }: { id: string }) {
  const { quotes } = useQuoteWorld()
  const requests = useRequests()
  const [step] = useState(() => takeLanding(id))
  const quote = quotes[id]
  if (!quote) return <NotInWorld what="That quote" back={{ name: "Quotes", href: "/admin/quotes", kind: "quote" }} />
  const photos = requests.find((r) => r.becameQuote?.quoteId === id)?.photos
  // arriving from a request or from New quote, the cursor starts in the first price box that is empty; nothing opens by itself
  return <QuotePage key={id} store={walkQuotes} quoteId={id} photos={photos} autoFocusPrice={step !== undefined} onArchived={(q, reason) => q.requestId && requestStore.archive(q.requestId, reason, REQUESTS_NOW)} />
}

/** The page of a job made from an approved quote. */
export function ApprovedJobRoute({ id }: { id: string }) {
  const { jobs, quotes } = useQuoteWorld()
  const requests = useRequests()
  const job = jobs[id]
  if (!job) return <NotInWorld what="That job" back={{ name: "Jobs", href: "/admin/jobs", kind: "job" }} />
  const requestId = quotes[job.quoteId]?.requestId
  const photos = requests.find((r) => r.id === requestId)?.photos
  return <ApprovedJobPage key={id} store={walkQuotes} jobId={id} photos={photos} />
}

/** The New quote sheet over the walkthrough's customers and catalogue: it makes a Draft quote with the one line, and its page opens. `sheet.customer` is a customer chosen already (a customer's page, More); `choice` and `pick` are what New job brought. */
export function NewQuoteHost({ sheet, onClose, onCreated }: { sheet: { customer?: string; choice?: CustomerChoice; pick?: ServicePick; key: number } | null; onClose: () => void; onCreated: (quoteId: string) => void }) {
  if (!sheet) return null
  return (
    <NewQuoteSheet
      key={sheet.key}
      data={WALK_DATA}
      open
      onOpenChange={(o) => !o && onClose()}
      customerId={sheet.customer}
      initial={sheet.choice || sheet.pick ? { customer: sheet.choice, pick: sheet.pick } : undefined}
      onCreate={({ choice, service }) => {
        const id = walkQuotes.createByHand({ ...partyOfChoice(choice), service: service.name, at: REQUESTS_NOW, price: service.price })
        setLanding(id, service.price ? "send" : "price")
        onCreated(id)
      }}
    />
  )
}

