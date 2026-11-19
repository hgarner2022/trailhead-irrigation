// The Docs page of "Start here: the admin, clickable": how to walk through, in the order to click, and what is placeholder. Plain JSX so the page
// needs no MDX in the Storybook config.

const STEPS: [string, string][] = [
  ["Jobs", "The start. Every row opens its job; Andrea Dalton's repair is the one with a clickable flow. New job opens a stand-in sheet whose Add job makes that repair."],
  ["A job and its flow", "On the repair: Schedule, Move, On my way, Mark done, How is this paid?, Send an invoice, Record the payment, Cancel job. The steps strip above the page shows where you are; the flow's own Start over resets only the job."],
  ["The customer", "Click Andrea Dalton in the customer card. Every tile, job, invoice and payment on her page is a link."],
  ["An invoice", "Open INV-2026-0042 from Billing or from her Invoices table. Remind, Collect payment and Cancel invoice each confirm in a dialog."],
  ["Invoices", "The rail item (on a phone: More). The four tiles filter the table; a row opens its invoice."],
  ["Back to Jobs", "The crumb above a page, the Prototype strip at the top, or Jobs in the rail. Start over resets everything."],
]

const PLACEHOLDERS = [
  "Customer pages for anyone other than Andrea Dalton, Marcus Bell and Dale Whitaker, and Dale's two Season Pass job pages: a labelled stand-in with a link on.",
  "Home, Schedule, Reports and Settings are the live screens over the repo's own fixture, so their customers are not Andrea, Marcus and Dale. New job is the live sheet: a job you add joins the Jobs grid until Start over.",
  "Links that leave the prototype (a phone number, an email, Stripe, the pay page, a receipt) show a toast: Outside the prototype.",
]

export function WalkthroughDocs() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 text-sm leading-6 text-foreground">
      <h1 className="font-display text-3xl font-semibold text-navy">How to walk through</h1>
      <p className="mt-2 text-muted-foreground">One prototype of the whole admin. Open the Laptop story (or Phone for 375) and click. Nothing is wired to the API: every button does what it would do, over fixtures.</p>
      <h2 className="mt-6 font-display text-xl font-semibold text-navy">The order</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {STEPS.map(([name, text]) => (
          <li key={name}>
            <span className="font-semibold">{name}.</span> {text}
          </li>
        ))}
      </ol>
      <h2 className="mt-6 font-display text-xl font-semibold text-navy">Where to click</h2>
      <p className="mt-2">Every record name is a chip and a link; a summary tile links to its thing; a table row opens its first record; Cmd or Ctrl+K searches customers and jobs by name, street, phone or pass number. The browser back button is not used: the crumb above a page and the Prototype strip go back.</p>
      <h2 className="mt-6 font-display text-xl font-semibold text-navy">What is placeholder</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {PLACEHOLDERS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="mt-6 text-muted-foreground">Under this group, the catalogue stories show each page in every state, for reference.</p>
    </div>
  )
}
