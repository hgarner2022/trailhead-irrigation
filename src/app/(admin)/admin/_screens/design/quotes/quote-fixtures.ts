import { dayOf, jobFromQuote, jobIdOf, type ApprovedJob, type Channel, type HistoryLine, type Party, type QuoteLine, type QuoteRecord } from "./quote-model"

// The quotes of the prototype's world (Hannah, Nov 22 2026: a quote is its own record): the fixtures, the job made from the one that was approved, and the two ways a quote is made, from a request and by hand. Pure data.


const ln = (id: string, name: string, amount: number, description?: string): QuoteLine => ({ id, name, amount, ...(description ? { description } : {}) })
const num = (n: number) => `Q-2026-${String(n).padStart(4, "0")}`

/** The facts every fixture quote shares unless it says otherwise: a Draft, nothing sent, nothing decided, no reminders. */
const base = (p: Party & { id: string; lines: QuoteLine[]; createdOn: string; history: HistoryLine[] } & Partial<QuoteRecord>): QuoteRecord => ({ total: 0, state: "draft", reminders: [], ...p })

/** Beth Orr's Christmas lights: a quote out with a $300 deposit, sent nine days ago. */
const BETH_LINES = [ln("b1", "Roofline lights", 900, "Front of the house."), ln("b2", "Porch columns", 300, "Both columns, wrapped.")]
/** Greg Olsen's larger repair: a quote out with no deposit, sent four days ago and reminded once. */
const GREG_LINES = [ln("g1", "Sprinkler repair visit", 145, "Find the fault and fix what we can that day."), ln("g2", "Valve replacement", 230), ln("g3", "New lines, zone 6", 485)]

export const QUOTE_FIXTURES: QuoteRecord[] = [
  base({
    id: num(4),
    customerId: "other-dana-cho",
    customer: "Dana Cho",
    first: "Dana",
    phone: "(970) 555-0171",
    email: "dana.cho@example.com",
    contact: "text",
    service: "Larger sprinkler repair",
    street: "18 Cedar Way",
    town: "Erie",
    requestId: "rq-dana",
    words: "Zone 3 has a geyser by the driveway after the blowout. I would like a price to redo that line.",
    lines: [ln("d1", "Larger sprinkler repair", 0)],
    createdOn: "2026-11-13T17:00:00Z",
    history: [
      { at: "2026-11-13T15:20:00Z", actor: "Dana", what: "Zone 3 has a geyser by the driveway after the blowout. I would like a price to redo that line.", note: "Zone 3 has a geyser by the driveway after the blowout. I would like a price to redo that line." },
      { at: "2026-11-13T17:00:00Z", actor: "Ryan", what: "Created from a request on Nov 13" },
    ],
  }),
  base({
    id: num(7),
    customerId: "other-beth-orr",
    customer: "Beth Orr",
    first: "Beth",
    phone: "(970) 555-0159",
    email: "beth.orr@example.com",
    contact: "email",
    service: "Christmas lights",
    street: "33 Aspen Ct",
    town: "Lafayette",
    requestId: "rq-beth",
    words: "Front of the house and the porch columns, please. We are away until the 20th of December.",
    lines: BETH_LINES,
    total: 1200,
    deposit: { amount: 300, percent: 25 },
    state: "sent",
    createdOn: "2026-11-10T15:00:00Z",
    sentOn: "2026-11-09T21:00:00Z",
    sentVia: "email",
    history: [
      { at: "2026-11-09T19:45:00Z", actor: "Beth", what: "Front of the house and the porch columns, please. We are away until the 20th of December.", note: "Front of the house and the porch columns, please. We are away until the 20th of December." },
      { at: "2026-11-10T15:00:00Z", actor: "Ryan", what: "Created from a request on Nov 10" },
      { at: "2026-11-09T21:00:00Z", actor: "Ryan", what: `Sent quote ${num(7)} by email` },
    ],
  }),
  base({
    id: num(8),
    customerId: "other-greg-olsen",
    customer: "Greg Olsen",
    first: "Greg",
    phone: "(970) 555-0123",
    email: "greg.olsen@example.com",
    contact: "text",
    service: "Larger sprinkler repair",
    street: "5 Birch Ln",
    town: "Erie",
    lines: GREG_LINES,
    total: 860,
    state: "sent",
    createdOn: "2026-11-14T16:00:00Z",
    sentOn: "2026-11-14T17:00:00Z",
    sentVia: "text",
    reminders: [{ at: "2026-11-16T17:00:00Z", via: "text" }],
    history: [
      { at: "2026-11-14T16:00:00Z", actor: "Ryan", what: "Quote created by the office" },
      { at: "2026-11-14T17:00:00Z", actor: "Ryan", what: `Sent quote ${num(8)} by text` },
      { at: "2026-11-16T17:00:00Z", actor: "Ryan", what: `Sent a reminder for quote ${num(8)} by text` },
    ],
  }),
]

/** Quotes with a history (Nov 20 2026), so the Quotes list shows every status beside the ones that wait: Nora Quinn approved by card with her deposit paid (and her job made), Owen Pratt declined, and Ravi Shah's quote replaced by a revision that is a Draft again. Numbers stay at or under 0008 so the next quote is still Q-2026-0009. */
const NORA_LINES = [ln("n1", "Roofline lights", 550, "Front of the house."), ln("n2", "Shrub wrap", 200)]
const OWEN_LINES = [ln("o1", "Larger sprinkler repair", 650), ln("o2", "New lines, zone 2", 500)]
const RAVI_LINES = [ln("r1", "Larger sprinkler repair", 620)]
export const HISTORY_QUOTES: QuoteRecord[] = [
  base({
    id: num(5),
    customerId: "other-nora-quinn",
    customer: "Nora Quinn",
    first: "Nora",
    phone: "(970) 555-0148",
    email: "nora.quinn@example.com",
    contact: "text",
    service: "Christmas lights",
    street: "12 Elk Ct",
    town: "Louisville",
    lines: NORA_LINES,
    total: 750,
    deposit: { amount: 200, paid: { how: "card", on: "2026-11-12T16:30:00Z" } },
    state: "approved",
    createdOn: "2026-11-10T19:00:00Z",
    sentOn: "2026-11-10T20:00:00Z",
    sentVia: "text",
    decidedOn: "2026-11-12T16:30:00Z",
    decidedBy: "customer",
    jobId: jobIdOf(num(5)),
    history: [
      { at: "2026-11-10T20:00:00Z", actor: "Ryan", what: `Sent quote ${num(5)} by text` },
      { at: "2026-11-12T16:30:00Z", actor: "Nora", what: `Approved quote ${num(5)}` },
    ],
  }),
  base({
    id: num(6),
    customerId: "other-owen-pratt",
    customer: "Owen Pratt",
    first: "Owen",
    phone: "(970) 555-0166",
    email: "owen.pratt@example.com",
    contact: "email",
    service: "Larger sprinkler repair",
    street: "40 Hill St",
    town: "Erie",
    lines: OWEN_LINES,
    total: 1150,
    state: "declined",
    createdOn: "2026-11-11T17:00:00Z",
    sentOn: "2026-11-11T18:00:00Z",
    sentVia: "email",
    decidedOn: "2026-11-14T15:00:00Z",
    decidedBy: "customer",
    history: [
      { at: "2026-11-11T18:00:00Z", actor: "Ryan", what: `Sent quote ${num(6)} by email` },
      { at: "2026-11-14T15:00:00Z", actor: "Owen", what: `Declined quote ${num(6)}` },
    ],
  }),
  base({
    id: num(2),
    customerId: "other-ravi-shah",
    customer: "Ravi Shah",
    first: "Ravi",
    phone: "(970) 555-0192",
    email: "ravi.shah@example.com",
    contact: "text",
    service: "Larger sprinkler repair",
    street: "8 Willow Dr",
    town: "Firestone",
    lines: RAVI_LINES,
    total: 620,
    state: "replaced",
    createdOn: "2026-11-05T16:00:00Z",
    sentOn: "2026-11-05T17:00:00Z",
    sentVia: "text",
    replacedBy: num(3),
    history: [
      { at: "2026-11-05T17:00:00Z", actor: "Ryan", what: `Sent quote ${num(2)} by text` },
      { at: "2026-11-06T16:00:00Z", actor: "Ryan", what: `Revised quote ${num(2)}: it is now Replaced by ${num(3)}` },
    ],
  }),
  base({
    id: num(3),
    customerId: "other-ravi-shah",
    customer: "Ravi Shah",
    first: "Ravi",
    phone: "(970) 555-0192",
    email: "ravi.shah@example.com",
    contact: "text",
    service: "Larger sprinkler repair",
    street: "8 Willow Dr",
    town: "Firestone",
    lines: RAVI_LINES,
    replaces: num(2),
    createdOn: "2026-11-06T16:00:00Z",
    history: [{ at: "2026-11-06T16:00:00Z", actor: "Ryan", what: `Revision of quote ${num(2)}` }],
  }),
]

export const ALL_QUOTE_FIXTURES: QuoteRecord[] = [...QUOTE_FIXTURES, ...HISTORY_QUOTES]
export const fixtureQuote = (id: string): QuoteRecord => structuredClone(ALL_QUOTE_FIXTURES.find((q) => q.id === id)!)

/** The job made from Nora Quinn's approved quote: her $750 with the $200 deposit paid by card. */
export const JOB_FIXTURES: ApprovedJob[] = [jobFromQuote(HISTORY_QUOTES[0]!, { by: "customer", at: "2026-11-12T16:30:00Z", deposit: { how: "card" } })]
export const fixtureJob = (id: string): ApprovedJob => structuredClone(JOB_FIXTURES.find((j) => j.jobId === id)!)

/** Priya Nair's new system: booked online as a design visit, which Ryan did on Nov 12. The price is set at the visit, so the quote is a Draft with the line unpriced; he prices it and sends it from the quote's page. */
export const DESIGN_VISIT_QUOTE: QuoteRecord = base({
  id: num(1),
  customerId: "priya",
  customer: "Priya Nair",
  first: "Priya",
  phone: "(970) 555-0123",
  email: "priya.nair@example.com",
  contact: "text",
  service: "New sprinkler system installation",
  street: "77 Aspen Way",
  town: "Firestone",
  visit: { name: "Design visit", day: "2026-11-12T17:00:00Z", done: true, who: "Ryan Garner" },
  lines: [ln("i1", "New sprinkler system installation", 0)],
  createdOn: "2026-11-12T19:05:00Z",
  history: [
    { at: "2026-11-05T16:00:00Z", actor: "Priya", what: "Booked a design visit for a new sprinkler system online" },
    { at: "2026-11-12T19:00:00Z", actor: "Ryan", what: "Design visit marked done" },
    { at: "2026-11-12T19:05:00Z", actor: "Ryan", what: "Quote created by the office" },
  ],
})

/**
 * A quote made from a request (Hannah, Nov 22 2026: Send a quote makes the customer and a QUOTE in Draft, never a job). The customer's words are the first note on it and the
 * request's photos come along; the one line is the service's catalogue line, priced when the catalogue has a price, else unpriced. Nothing exists on the Jobs list.
 */
export function quoteFromRequest(o: { id: string; requestId: string; customerId: string; customer: string; first: string; phone: string; email: string; contact: Channel; service: string; street: string; town: string; words: string; receivedAt: string; at: string; price?: number }): QuoteRecord {
  return base({
    id: o.id,
    customerId: o.customerId,
    customer: o.customer,
    first: o.first,
    phone: o.phone,
    email: o.email,
    contact: o.contact,
    service: o.service || "Job",
    street: o.street,
    town: o.town,
    requestId: o.requestId,
    words: o.words,
    lines: [{ id: "l1", name: o.service || "Job", amount: o.price ?? 0 }],
    createdOn: o.at,
    history: [
      ...(o.words ? [{ at: o.receivedAt, actor: o.first, what: o.words, note: o.words }] : []),
      { at: o.at, actor: "Ryan", what: `Created from a request on ${dayOf(o.at)}` },
    ],
  })
}

/** A quote made by hand, with no request (New quote): the line is the service, priced from the catalogue when it has a price. */
export function quoteByHand(o: { id: string; customerId: string; customer: string; first: string; phone: string; email: string; contact: Channel; service: string; street: string; town: string; at: string; price?: number }): QuoteRecord {
  return base({
    id: o.id,
    customerId: o.customerId,
    customer: o.customer,
    first: o.first,
    phone: o.phone,
    email: o.email,
    contact: o.contact,
    service: o.service || "Job",
    street: o.street,
    town: o.town,
    lines: [{ id: "l1", name: o.service || "Job", amount: o.price ?? 0 }],
    createdOn: o.at,
    history: [{ at: o.at, actor: "Ryan", what: "Quote created by the office" }],
  })
}
