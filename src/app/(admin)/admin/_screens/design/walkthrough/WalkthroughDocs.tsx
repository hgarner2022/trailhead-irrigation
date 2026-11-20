// The Docs page of "Admin / Walkthrough (clickable)": four lines. Plain JSX so the page needs no MDX in the Storybook config.

export function WalkthroughDocs() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-8 text-base leading-7 text-foreground">
      <h1 className="font-display text-3xl font-semibold text-navy">How to walk through</h1>
      <p><span className="font-semibold">Who you are.</span> Ryan, or the office, running the day in the admin.</p>
      <p><span className="font-semibold">The path.</span> Jobs, Andrea Dalton&apos;s repair and its flow to Billed, her customer page, Invoices and an invoice, then New job.</p>
      <p><span className="font-semibold">What to click.</span> Any name, tile, row or rail item. Cmd or Ctrl+K searches. Start over resets it. Home, Schedule, Reports and Settings are the live screens.</p>
      <p><span className="font-semibold">Customer statuses.</span> Customers lists seven: Active, New (Priya Nair), Past customer (Ivy Lund, Do not service) and, behind Show archived, Gus Pratt. A New job for Gus brings him back.</p>
      <p><span className="font-semibold">Requests.</span> Requests is in the rail after Schedule, with a count of the new ones. Open Rosa Delgado and press Send a quote (Christmas lights has no catalogue price, so it leads): the request moves into a job that needs a quote and its page opens on the line to price; price it, then Send a quote with a deposit and the job reads Quote sent in Jobs. Open Tom Ellis and press Create job (a priced repair): the request becomes an Unscheduled job. Either way the request leaves the list. A request sent from the booking form in the customer walkthrough shows here as New.</p>
      <p><span className="font-semibold">Quotes.</span> Quotes is in the rail after Jobs, with a count of the quotes still waiting for an answer. It lists every quote with its status (Sent, Approved, Declined, Replaced); the three tiles filter it, Remind is on a Sent quote, and a click on a row opens the job at its Quote section. Send a quote from a job and it is a row here at once, with the count one higher. Cmd or Ctrl+K finds a quote by its number or the customer&apos;s name, and Home&apos;s Quote waiting rows open the list.</p>
    </div>
  )
}
