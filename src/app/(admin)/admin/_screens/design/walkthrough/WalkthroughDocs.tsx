// The Docs page of "Admin / Walkthrough (clickable)": three lines. Plain JSX so the page needs no MDX in the Storybook config.

export function WalkthroughDocs() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-8 text-base leading-7 text-foreground">
      <h1 className="font-display text-3xl font-semibold text-navy">How to walk through</h1>
      <p><span className="font-semibold">Who you are.</span> Ryan, or the office, running the day in the admin.</p>
      <p><span className="font-semibold">The path.</span> Jobs, Andrea Dalton&apos;s repair and its flow to Billed, her customer page, Invoices and an invoice, then New job.</p>
      <p><span className="font-semibold">What to click.</span> Any name, tile, row or rail item. Cmd or Ctrl+K searches. Start over resets it. Home, Schedule, Reports and Settings are the live screens.</p>
    </div>
  )
}
