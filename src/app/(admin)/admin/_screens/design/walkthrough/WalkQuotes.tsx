"use client"

import { useEffect, useState } from "react"
import { RecordChip } from "@/components/blocks/RecordChip"
import { useToast } from "@/components/blocks/Toast"
import { QuoteJobPage } from "../quotes/QuoteJobPage"
import { QuotesList } from "../quotes/QuotesList"
import { QUOTES_NOW, VIA_WORDS } from "../quotes/quote-model"
import { useQuoteJobs, walkQuotes } from "../quotes/quote-store"
import { useRequests } from "../requests/request-store"
import { Placeholder } from "./Placeholder"
import { takeLanding } from "./WalkRequests"

// A job that has a quote, in the walkthrough: the quote page over the walkthrough's one quote store, so sending, reminding, revising and approving here
// show in the Jobs grid's Status and Home. The request's photos come along to the job. Arriving from a request (Send a quote) or from New job, the next step
// is already open: price the line, or the Send a quote dialog once a line has a price.

/** The Quotes list over the walkthrough's one quote store: a quote sent from a job is a row here at once, and Remind uses the quote's own dialog. */
export function QuotesRoute({ filter }: { filter?: "sent" }) {
  const jobs = useQuoteJobs()
  const toast = useToast()
  return (
    <QuotesList
      key={filter ?? "all"}
      jobs={Object.values(jobs)}
      now={QUOTES_NOW}
      initialFilters={filter === "sent" ? [{ column: "status", values: ["sent"] }] : undefined}
      onRemind={(job, _quote, { via }) => {
        walkQuotes.remind(job.jobId, { via, at: QUOTES_NOW })
        toast(`Reminder sent to ${job.first} by ${VIA_WORDS[via]}`)
      }}
    />
  )
}

export function QuoteJobRoute({ id, anchor }: { id: string; anchor?: "quote" }) {
  const jobs = useQuoteJobs()
  const requests = useRequests()
  const [step] = useState(() => takeLanding(id))
  const job = jobs[id]
  // arriving from a quote chip, a Quotes row or a Cmd+K hit: the job opens at its Quote section
  useEffect(() => {
    if (anchor === "quote") document.getElementById("quote-h")?.scrollIntoView({ block: "start" })
  }, [anchor, id])
  if (!job) {
    return (
      <Placeholder title="Not in this prototype" line="That job is not in the prototype's world. Jobs has every record that opens.">
        <RecordChip kind="job" name="Back to Jobs" href="/admin/jobs" />
      </Placeholder>
    )
  }
  const photos = requests.find((r) => r.becameJob?.jobId === id)?.photos
  const firstLine = job.lines[0]?.id
  const initialDialog = step === "send" ? ("send" as const) : step === "price" && firstLine ? { line: firstLine } : null
  return <QuoteJobPage key={id} store={walkQuotes} jobId={id} photos={photos} initialDialog={initialDialog} />
}
