// Feature flags for the app. Each reads process.env when called, never at
// module scope, so a test or a deploy can change it without a rebuild of this file.
// Both go on in production last (wiring plan, decision 16).

/** SEASON_PASS_CHECKOUT=on opens /season-pass/checkout. */
export function checkoutEnabled(): boolean {
  return process.env.SEASON_PASS_CHECKOUT === "on"
}

/** APP_BOOKING=on swaps the Jobber iframe at /book for the app's own form. */
export function bookingEnabled(): boolean {
  return process.env.APP_BOOKING === "on"
}
