"use client"

import { RecordChip } from "@/components/blocks/RecordChip"
import { QuoteJobPage } from "../quotes/QuoteJobPage"
import { useQuoteJobs, walkQuotes } from "../quotes/quote-store"
import { useRequests } from "../requests/request-store"
import { Placeholder } from "./Placeholder"

// A job that has a quote, in the walkthrough: the quote page over the walkthrough's one quote store, so sending, reminding, revising and approving here
// show in the Jobs grid's Status, the request's page and Home. The request's photos come along to the job.

export function QuoteJobRoute({ id }: { id: string }) {
  const jobs = useQuoteJobs()
  const requests = useRequests()
  if (!jobs[id]) {
    return (
      <Placeholder title="Not in this prototype" line="That job is not in the prototype's world. Jobs has every record that opens.">
        <RecordChip kind="job" name="Back to Jobs" href="/admin/jobs" />
      </Placeholder>
    )
  }
  const photos = requests.find((r) => r.accepted?.jobId === id)?.photos
  return <QuoteJobPage key={id} store={walkQuotes} jobId={id} photos={photos} />
}
