/**
 * Whether a customer has a card to charge after each visit: one card per customer, kept on the customer row. A pass may have none:
 * the office sold it and the customer pays at each visit (check, Venmo or cash) or adds a card from a link later. The checkout's
 * `passes.activate` stores both the Stripe handle and the card's last four; the seeded fixtures carry only the last four, so
 * either says "a card".
 */
export const customerHasCard = (customer: { stripePaymentMethodId?: string | null; cardLast4?: string | null }): boolean => Boolean(customer.stripePaymentMethodId || customer.cardLast4)
