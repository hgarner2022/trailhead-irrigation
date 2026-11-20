// The words a customer reads about a quote, once (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.8 and "Deposits and card on file at approval";
// Hannah's answers of Nov 20 2026). They are built only from facts: the service, the street, the total, the deposit, the number and the link. They promise
// nothing: no call-back time, no "free", no guarantee, no refund terms, no reassurance, no quote expiry. A customer reads "quote", never "job", "line" or
// "stage". The two sentences Hannah has not written (how a saved card may be used, and what happens to a deposit when work is canceled) are placeholders
// and say so. Not wired: the live renderers in src/emails and src/sms are not changed. Pure strings.

export interface QuoteFacts {
  first: string
  /** "Christmas lights" */
  service: string
  /** the street, "212 Spruce Ct" */
  address: string
  /** "$1,200" */
  total: string
  /** "$300", only when the quote asks for one */
  deposit?: string
  /** "Q-2026-0007" */
  number: string
  /** the quote page, "trailheadirrigation.com/quote/Q-2026-0007" */
  link: string
}

export const quoteLink = (number: string) => `trailheadirrigation.com/quote/${number}`

const OF = (f: QuoteFacts) => `${f.service} at ${f.address}`

/** The text that carries the quote's link. One ask, last. */
export const quoteText = (f: QuoteFacts) => `Trailhead: Your quote for ${OF(f)} is ${f.total}${f.deposit ? `, and a ${f.deposit} deposit is due when you approve` : ""}. Approve or decline here: ${f.link}`

/** Sent only when Ryan presses Remind. */
export const quoteReminderText = (f: QuoteFacts) => `Trailhead: A reminder about your quote for ${OF(f)}, ${f.total}. Approve or decline here: ${f.link}`

export const quoteApprovedText = (f: QuoteFacts & { depositPaid?: boolean }) => `Trailhead: You approved your quote for ${OF(f)}, ${f.total}.${f.depositPaid && f.deposit ? ` We received your ${f.deposit} deposit.` : ""}`

export const quoteDeclinedText = (f: QuoteFacts) => `Trailhead: You declined your quote for ${OF(f)}, ${f.total}.`

/** The email subjects follow the fact-first pattern of the other messages: the kind, then the figure, the service and the street. */
export const quoteSubject = (f: QuoteFacts) => `Quote: ${f.total} for ${OF(f)}`
export const quoteReminderSubject = (f: QuoteFacts) => `Reminder: quote for ${OF(f)}, ${f.total}`
export const quoteApprovedSubject = (f: QuoteFacts) => `Approved: quote for ${OF(f)}, ${f.total}`
export const quoteDeclinedSubject = (f: QuoteFacts) => `Declined: quote for ${OF(f)}, ${f.total}`

/** The lead of each email: the fact, with the deposit sentence only when there is one. */
export const quoteLead = (f: QuoteFacts) => `Here is your quote for ${OF(f)}. The total is ${f.total}.${f.deposit ? ` A ${f.deposit} deposit is due when you approve.` : ""}`
export const quoteReminderLead = (f: QuoteFacts) => `This is a reminder about your quote for ${OF(f)}. The total is ${f.total}.${f.deposit ? ` A ${f.deposit} deposit is due when you approve.` : ""}`
export const quoteApprovedLead = (f: QuoteFacts & { depositPaid?: boolean }) => `You approved your quote for ${OF(f)}, ${f.total}.${f.depositPaid && f.deposit ? ` We received your ${f.deposit} deposit.` : ""}`
export const quoteDeclinedLead = (f: QuoteFacts) => `You declined your quote for ${OF(f)}, ${f.total}.`

/**
 * A price change after the customer approved (Hannah, Nov 20 2026): Ryan tells them, there is no second approval. Only the facts: the job, the street, what
 * the total was and what it is now. No reason, no apology, no promise, no link to approve anything.
 */
export interface PriceChangeFacts {
  service: string
  address: string
  /** "$1,500" */
  total: string
  /** "$1,200" */
  was: string
}
export const priceChangeText = (f: PriceChangeFacts) => `Trailhead: The total for your ${f.service} at ${f.address} changed from ${f.was} to ${f.total}.`
export const priceChangeSubject = (f: PriceChangeFacts) => `New total: ${f.total} for ${f.service} at ${f.address}`
export const priceChangeLead = (f: PriceChangeFacts) => `The total for your ${f.service} at ${f.address} changed from ${f.was} to ${f.total}.`

/** The one line after a request: Hannah's answer 9. Nothing about when, nothing promised. */
export const REQUEST_THANKS = "Thanks. We've got your request."

/** The email that states a request arrived: the same words, then what was asked, so it can be checked. */
export const requestReceivedSubject = "We've got your request"

/** Placeholders for the sentences Hannah has not written. They are shown marked, never invented. */
export const CARD_TERMS_PLACEHOLDER = "[Wording from Hannah]"
