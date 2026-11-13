/** Fires a GA4 event if gtag is available; otherwise does nothing. Safe on the server and before Google's script has loaded. */
export function fireEvent(name: string, params: Record<string, unknown> = {}): boolean {
  if (typeof window === "undefined") return false
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag !== "function") return false
  gtag("event", name, params)
  return true
}

export interface PurchaseDetails {
  number: string
  zones: number
  /** whole dollars: what the pass's visits cost in total, charged after each visit, not at purchase */
  passTotal: number
  inspection: boolean
}

/**
 * The `season_pass_purchase` event, with GA4's purchase fields. Nothing is charged when the season is reserved, so `value` is 0
 * and GA4 counts no revenue for it; the pass's total goes in `pass_total`. Mark it as a conversion in GA4 → Admin → Events.
 */
export function fireSeasonPassPurchase(p: PurchaseDetails): boolean {
  return fireEvent("season_pass_purchase", { transaction_id: p.number, value: 0, pass_total: p.passTotal, currency: "USD", zones: p.zones, inspection: p.inspection })
}
