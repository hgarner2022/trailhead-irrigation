/**
 * Whether a customer has a real card to charge after each visit: one card per customer, kept on the customer row, and real means
 * Stripe holds a payment method for it (`stripePaymentMethodId`). A last four alone is not a card (a checkout that saved no
 * method, an old import): nothing can be charged, so the visit is paid like a one-off's. A pass may have none: the office sold
 * it and the customer pays at each visit (check, Venmo or cash) or adds a card from a link later. The fixtures carry a fake
 * method id beside the last four.
 */
export const customerHasCard = (customer: { stripePaymentMethodId?: string | null; cardLast4?: string | null }): boolean => Boolean(customer.stripePaymentMethodId)

/** The card columns a saved card writes, on the customer; a null card clears them (and, for a saved one, the failure mark). */
export type CardColumns = { stripePaymentMethodId: string | null; cardBrand: string | null; cardLast4: string | null; cardExpires: string | null }
export function cardColumns(card: { paymentMethodId: string; brand: string | null; last4: string | null; expires: string | null }): CardColumns & { cardFailedAt: null } {
  return { stripePaymentMethodId: card.paymentMethodId, cardBrand: card.brand, cardLast4: card.last4, cardExpires: card.expires, cardFailedAt: null }
}
export const clearedCardColumns: CardColumns = { stripePaymentMethodId: null, cardBrand: null, cardLast4: null, cardExpires: null }
