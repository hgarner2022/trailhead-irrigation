// "How is this paid?": what a done visit's second beat offers, as a plan. Pure, no database: the panels pass the facts (what is
// unpaid, the card on file, whether a Season Pass is the job, whether an invoice is out) and read back the choices in
// order, their words, which one starts selected and which are held back. Nothing here moves money; every choice is a button the
// office presses (docs/plans/2026-11-18-done-and-paid-design.md, section 3). The words after a payment come from `words.ts`.
import { METHOD_WORDS, paidTotal, type MoneyPayment } from "./words"

export type PayChoice = "card" | "check" | "venmo" | "cash" | "invoice" | "later"

export interface PayOption {
  value: PayChoice
  label: string
  /** the line under the choice: what pressing the button does */
  line: string
  /** the button's words, with the amount */
  button: string
}

export interface CollectInput {
  /** whole dollars still unpaid; 0 for a visit nothing has priced yet */
  amount: number
  /** the card Stripe holds for the customer, as the panel shows it */
  card?: { brand?: string | null; last4: string }
  /** a Season Pass visit: the card was agreed at checkout */
  isPass: boolean
  /** an invoice is open on the job */
  invoiceOpen: boolean
  /** the job can be invoiced now (done, owes money, nothing open) */
  canInvoice: boolean
  /** the newest card attempt for this visit did not go through */
  declined: boolean
  /** a card charge is going through */
  charging: boolean
  /** the day an invoice falls due, in days */
  dueDays?: number
}

export interface CollectPlan {
  amount: number
  /** "Visa ending 4242"; undefined with no card */
  cardWords?: string
  /** a priced Season Pass visit with a card: "Charge the card as agreed", the other ways behind "Paid another way" */
  asAgreed: boolean
  declined: boolean
  charging: boolean
  /** the visit has no price yet: the office types what came */
  needsAmount: boolean
  options: PayOption[]
  /** held back behind a quiet "Paid another way" (a pass visit with a card); empty otherwise */
  anotherWay: PayOption[]
  initial: PayChoice
}

export const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

/** "Visa ending 4242", or "card ending 4242" when the brand is not known. */
export const cardWordsOf = (card: { brand?: string | null; last4: string }) => `${card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : "card"} ending ${card.last4}`

const handed = (value: "check" | "venmo" | "cash", amount: number): PayOption => ({
  value,
  label: value === "check" ? "Check" : value === "venmo" ? "Venmo" : "Cash",
  line: value === "cash" ? "Emails a receipt" : value === "check" ? "Check number, and emails a receipt" : "Venmo handle, and emails a receipt",
  button: amount > 0 ? `Record ${dollars(amount)} paid` : "Record the payment",
})

/**
 * The plan for one done visit that is not paid. A real card is the default and a button like the rest; a Season Pass visit with one
 * reads "Charge the card as agreed" with no Pay later and the cash ways behind "Paid another way". Pay later is offered only when the
 * customer has no card. Tap to pay is the panel's greyed row, never an option here.
 */
export function collectPlan(i: CollectInput): CollectPlan {
  const needsAmount = i.amount <= 0
  const cardWords = i.card ? cardWordsOf(i.card) : undefined
  const useCard = Boolean(i.card) && !i.declined && !i.invoiceOpen && !needsAmount
  const ways = (["check", "venmo", "cash"] as const).map((v) => handed(v, i.amount))
  const asAgreed = useCard && i.isPass
  const card: PayOption[] = useCard
    ? [{ value: "card", label: asAgreed ? "Charge the card as agreed" : `Charge the ${cardWords} now`, line: `Charges ${dollars(i.amount)} to the ${asAgreed ? cardWords : "card"} and emails a receipt`, button: `Charge ${dollars(i.amount)}` }]
    : []
  const invoice: PayOption[] = i.canInvoice && !i.invoiceOpen && !needsAmount && !asAgreed
    ? [{ value: "invoice", label: "Send an invoice", line: `Texts a pay link, due in ${i.dueDays ?? 14} days`, button: "Send the invoice" }]
    : []
  const later: PayOption[] = !i.card && !i.invoiceOpen && !i.declined
    ? [{ value: "later", label: "Pay later", line: "Nothing is collected now; it reads Unpaid until a payment or an invoice", button: "Leave it unpaid" }]
    : []
  const options = asAgreed ? card : [...card, ...ways, ...invoice, ...later]
  return { amount: i.amount, cardWords, asAgreed, declined: i.declined, charging: i.charging, needsAmount, options, anotherWay: asAgreed ? ways : [], initial: options[0]!.value }
}

/** What the panel says once the money has moved: "Paid, card" and who was emailed. Never typed: the method words are `METHOD_WORDS`. */
export function paidWords(method: string): string {
  const how = METHOD_WORDS[method]
  return how ? `Paid, ${how}` : "Paid"
}

/** The receipt line under "Paid": "Receipt emailed to Andrea." */
export const receiptLine = (firstName: string) => `Receipt emailed to ${firstName}.`

/** What the panel says while a card charge is going through. */
export const chargingWords = (amount: number, cardWords: string) => `Charging ${dollars(amount)} to the ${cardWords}`

/** The payment a Refund reverses: the newest succeeded positive payment by check, Venmo or cash that no refund has taken back; undefined for a card payment (Stripe's own refund) or when nothing is left. */
export function refundable(payments: readonly (MoneyPayment & { reference?: string | null })[]): { payment: MoneyPayment; left: number } | undefined {
  const paid = [...payments].reverse().find((p) => p.status === "succeeded" && p.amount > 0 && !p.refundsPaymentId && ["check", "venmo", "cash"].includes(p.method))
  if (!paid) return undefined
  const left = paid.amount + paidTotal(payments.filter((p) => p.refundsPaymentId === paid.id))
  return left > 0 ? { payment: paid, left } : undefined
}
