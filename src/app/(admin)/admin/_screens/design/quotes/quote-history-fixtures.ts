import type { QuoteJob, QuoteLine } from "./quote-model"

/**
 * Three quotes with a history (Nov 20 2026), so the Quotes list shows every status beside the two that wait: Nora Quinn approved by card with her deposit
 * paid, Owen Pratt declined, and Ravi Shah's quote replaced by a revise (that job reads Needs a quote again). Numbers stay at or under 0006 so the next
 * quote is still Q-2026-0009.
 */
const ln = (id: string, name: string, amount: number, description?: string): QuoteLine => ({ id, name, amount, ...(description ? { description } : {}) })

const NORA_LINES = [ln("n1", "Roofline lights", 550, "Front of the house."), ln("n2", "Shrub wrap", 200)]
const OWEN_LINES = [ln("o1", "Larger sprinkler repair", 650), ln("o2", "New lines, zone 2", 500)]
const RAVI_LINES = [ln("r1", "Larger sprinkler repair", 620)]
export const QUOTE_HISTORY_FIXTURES: QuoteJob[] = [
  {
    jobId: "q-nora",
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
    quotes: [{ id: "Q-2026-0005", jobId: "q-nora", lines: NORA_LINES, total: 750, deposit: { amount: 200, paid: { how: "card", on: "2026-11-12T16:30:00Z" } }, sentOn: "2026-11-10T20:00:00Z", sentVia: "text", state: "approved", decidedOn: "2026-11-12T16:30:00Z", decidedBy: "customer", reminders: [] }],
    history: [
      { at: "2026-11-10T20:00:00Z", actor: "Ryan", what: "Sent quote Q-2026-0005 by text" },
      { at: "2026-11-12T16:30:00Z", actor: "Nora", what: "Approved quote Q-2026-0005" },
    ],
  },
  {
    jobId: "q-owen",
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
    quotes: [{ id: "Q-2026-0006", jobId: "q-owen", lines: OWEN_LINES, total: 1150, sentOn: "2026-11-11T18:00:00Z", sentVia: "email", state: "declined", decidedOn: "2026-11-14T15:00:00Z", decidedBy: "customer", reminders: [] }],
    history: [
      { at: "2026-11-11T18:00:00Z", actor: "Ryan", what: "Sent quote Q-2026-0006 by email" },
      { at: "2026-11-14T15:00:00Z", actor: "Owen", what: "Declined quote Q-2026-0006" },
    ],
  },
  {
    jobId: "q-ravi",
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
    quotes: [{ id: "Q-2026-0003", jobId: "q-ravi", lines: RAVI_LINES, total: 620, sentOn: "2026-11-05T17:00:00Z", sentVia: "text", state: "replaced", reminders: [] }],
    history: [
      { at: "2026-11-05T17:00:00Z", actor: "Ryan", what: "Sent quote Q-2026-0003 by text" },
      { at: "2026-11-06T16:00:00Z", actor: "Ryan", what: "Revised quote Q-2026-0003: it is now Replaced and the job needs a quote" },
    ],
  },
]
