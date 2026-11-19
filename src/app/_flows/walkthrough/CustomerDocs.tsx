// The Docs page of "Start here: the customer, clickable". Plain JSX so the page needs no MDX in the Storybook config.

const STEPS: [string, string][] = [
  ["Book online", "The whole form: only the services we book (the rest through Need a quote? Request one), the address, a day and an exact start time, your details with how we reach you (text, email or both) asked once, optional photos, then Confirm and book. The confirmation is the holographic card with the exact time and, if you added photos, You added 2 photos. Open your Trailhead account goes on."],
  ["Texts and emails", "What she gets, from the real renderers: the date set, two weeks out, the day before with the exact time, on my way, the invoice and the receipt, in the channel she chose. Click a link inside one and it opens that page."],
  ["Account", "Home: the next visit with Reschedule and Cancel (or Text Ryan inside 24 hours), an invoice to pay, the pass card and the latest visits."],
  ["Visits", "The timeline, then a visit page, then Reschedule (three days and Show more days) and Cancel with their done steps."],
  ["Pay an invoice", "Pay now opens the pay page (Stripe's box is drawn, never a card field), then Paid, then the receipt."],
  ["Season Pass", "The card, the season line, add July, skip a visit. See it from November 1 turns on Reserve next season, which opens the renewal checkout."],
  ["Details", "Name, phone, yard notes, Tell Ryan someone needs to be home, and how we reach you."],
]

export function CustomerDocs() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 text-sm leading-6 text-foreground">
      <h1 className="font-display text-3xl font-semibold text-navy">How to walk through</h1>
      <p className="mt-2 text-muted-foreground">The customer side in one prototype. Open Phone (the customer is on a phone) or Laptop. Next at the right of the strip goes to the next step; every step is also one click from the last by the links on its own screens. Nothing is sent.</p>
      <h2 className="mt-6 font-display text-xl font-semibold text-navy">The order</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {STEPS.map(([name, text]) => (
          <li key={name}>
            <span className="font-semibold">{name}.</span> {text}
          </li>
        ))}
      </ol>
      <h2 className="mt-6 font-display text-xl font-semibold text-navy">What is placeholder</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Sign in, Card updated and the marketing Season Pass page: a labelled stand-in with a way back to the account.</li>
        <li>Photos and the contact preference in Booking are built from the booking parts here; the live booking flow does not have them yet. Details shows the same preference under the live Details screen.</li>
        <li>Links that leave the prototype (a phone number, an email, Stripe, a calendar file) say so in the strip.</li>
      </ul>
      <p className="mt-6 text-muted-foreground">Under this group, the catalogue stories show each screen in every state, for reference.</p>
    </div>
  )
}
