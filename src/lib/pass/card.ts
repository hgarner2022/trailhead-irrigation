/**
 * Whether a pass has a card to charge after each visit. An active pass may have none: the office sold it and the customer pays
 * at each visit (check, Venmo or cash) or adds a card from a link later. The checkout's `passes.activate` stores both the Stripe
 * handle and the card's last four; the seeded fixtures carry only the last four, so either says "a card".
 */
export const passHasCard = (pass: { stripePaymentMethodId?: string | null; cardLast4?: string | null }): boolean => Boolean(pass.stripePaymentMethodId || pass.cardLast4)
