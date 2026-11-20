// The Docs page of "Start here: the customer, clickable": three lines. Plain JSX so the page needs no MDX in the Storybook config.

export function CustomerDocs() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-8 text-base leading-7 text-foreground">
      <h1 className="font-display text-3xl font-semibold text-navy">How to walk through</h1>
      <p><span className="font-semibold">Who you are.</span> Andrea Dalton, a customer of Trailhead, on your phone.</p>
      <p><span className="font-semibold">The steps.</span> Book online, the texts and emails, your account, a visit, pay an invoice, your receipt, Season Pass, Details.</p>
      <p><span className="font-semibold">What to do.</span> Click Next, or tap anything in the phone.</p>
    </div>
  )
}
