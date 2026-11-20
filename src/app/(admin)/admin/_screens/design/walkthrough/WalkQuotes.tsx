"use client"

import { useState } from "react"
import { RecordChip } from "@/components/blocks/RecordChip"
import { QuoteJobPage } from "../quotes/QuoteJobPage"
import { useQuoteJobs, walkQuotes } from "../quotes/quote-store"
import { useRequests } from "../requests/request-store"
import { Placeholder } from "./Placeholder"
import { takeLanding } from "./WalkRequests"

// A job that has a quote, in the walkthrough: the quote page over the walkthrough's one quote store, so sending, reminding, revising and approving here
// show in the Jobs grid's Status and Home. The request's photos come along to the job. Arriving from a request (Send a quote) or from New job, the next step
// is already open: price the line, or the Send a quote dialog once a line has a price.

export function QuoteJobRoute({ id }: { id: string }) {
  const jobs = useQuoteJobs()
  const requests = useRequests()
  const [step] = useState(() => takeLanding(id))
  const job = jobs[id]
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
