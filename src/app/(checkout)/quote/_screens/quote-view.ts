// What the customer's quote page holds (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.6 and "Deposits and card on file at approval"; Hannah's answers 3 to 7
// of Nov 20 2026): one quote behind a signed link, in the customer's words. A quote has a total and its lines, a deposit only when Ryan set one, and two buttons.
// A customer reads "quote", never "job", "line" or "stage". Pure data and functions, no React.

export interface QuoteLineView {
  name: string
  description?: string
  /** whole dollars */
  amount: number
}

export interface QuoteView {
  /** "Q-2026-0007" */
  number: string
  firstName: string
  /** where a receipt goes: the address on file */
  email: string
  service: string
  /** the street, "33 Aspen Ct" */
  address: string
  lines: QuoteLineView[]
  /** whole dollars */
  total: number
  /** whole dollars, set only when Ryan asked for one */
  deposit: number | null
}

/** Where a customer's quote stands. "replaced" and "old-link" are the two pages a link that no longer works can open. */
export type QuoteStatus = "open" | "approved" | "declined" | "replaced" | "old-link"

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

/** The quote in one phrase: "Christmas lights at 33 Aspen Ct". */
export const quoteOf = (q: Pick<QuoteView, "service" | "address">) => `${q.service} at ${q.address}`

/** The Approve button: one tap with no deposit, "Approve and pay $300" when a deposit is due. */
export const approveLabel = (q: Pick<QuoteView, "deposit">) => (q.deposit ? `Approve and pay ${money(q.deposit)}` : "Approve")

/** Beth Orr's Christmas lights: $1,200 with a $300 deposit. The words and prices are fixtures. */
export const WITH_DEPOSIT: QuoteView = {
  number: "Q-2026-0007",
  firstName: "Beth",
  email: "beth.orr@example.com",
  service: "Christmas lights",
  address: "33 Aspen Ct",
  lines: [
    { name: "Roofline lights", description: "Front of the house.", amount: 900 },
    { name: "Porch columns", description: "Both columns, wrapped.", amount: 300 },
  ],
  total: 1200,
  deposit: 300,
}

/** Greg Olsen's larger repair: $860 and no deposit. */
export const NO_DEPOSIT: QuoteView = {
  number: "Q-2026-0008",
  firstName: "Greg",
  email: "greg.olsen@example.com",
  service: "Larger sprinkler repair",
  address: "5 Birch Ln",
  lines: [
    { name: "Sprinkler repair visit", description: "Find the fault and fix what we can that day.", amount: 145 },
    { name: "Valve replacement", amount: 230 },
    { name: "New lines, zone 6", amount: 485 },
  ],
  total: 860,
  deposit: null,
}
