/**
 * Whether a customer has a card to charge after each visit: one card per customer, kept on the customer row. A pass may have none:
 * the office sold it and the customer pays at each visit (check, Venmo or cash) or adds a card from a link later. The checkout's
 * `passes.activate` stores both the Stripe handle and the card's last four; the seeded fixtures carry only the last four, so
 * either says "a card".
 */
export const customerHasCard = (customer: { stripePaymentMethodId?: string | null; cardLast4?: string | null }): boolean => Boolean(customer.stripePaymentMethodId || customer.cardLast4)

/** The card columns a saved card writes, on the customer and on every pass alias; a null card clears them (and, for a saved one, the failure mark). */
export type CardColumns = { stripePaymentMethodId: string | null; cardBrand: string | null; cardLast4: string | null; cardExpires: string | null }
export function cardColumns(card: { paymentMethodId: string; brand: string | null; last4: string | null; expires: string | null }): CardColumns & { cardFailedAt: null } {
  return { stripePaymentMethodId: card.paymentMethodId, cardBrand: card.brand, cardLast4: card.last4, cardExpires: card.expires, cardFailedAt: null }
}
export const clearedCardColumns: CardColumns = { stripePaymentMethodId: null, cardBrand: null, cardLast4: null, cardExpires: null }
