/**
 * An address with the parameters that stand in for signing in taken out, so a bearer link (the pay page's `?token=`, the renewal
 * email's token) is never sent to Google Analytics as the page's location. Every other parameter (utm_source and the rest) stays.
 * Self-contained on purpose: `GoogleAnalytics` writes this function's own source into the page's inline script, so the browser runs
 * exactly what the tests ran. An address that does not parse keeps only what comes before its `?`.
 */
export function stripSecretParams(href: string): string {
  try {
    const url = new URL(href)
    url.searchParams.delete("token")
    return url.toString()
  } catch {
    return href.split("?")[0] ?? ""
  }
}
