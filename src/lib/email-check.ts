/**
 * The email checks the checkout and the booking form run while the customer
 * types: is it shaped like an email, and does the domain look like a slip of
 * a common one. The slip is offered, never forced. Whether the mailbox
 * exists is the server's job (an MX lookup in `passes.create`), and the
 * confirmation email's sign-in link is the proof it was read.
 */

const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "comcast.net", "aol.com", "me.com", "live.com", "msn.com", "protonmail.com", "q.com"] as const

/** Real domains a slip would otherwise be "corrected" away from. */
const KNOWN = new Set(["mail.com", "ymail.com", "email.com", "rocketmail.com", "pm.me", "hey.com", "duck.com"])

/** Why the email cannot pass yet, in the words the screen shows; null when it can. */
export function emailProblem(email: string): string | null {
  const value = email.trim()
  if (!value) return "We need an email for the receipt."
  if (!SHAPE.test(value)) return "That email doesn't look complete."
  return null
}

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = temp
    }
  }
  return prev[b.length]
}

/** The same address on a common domain when the typed domain is a slip of one ("gmail.con", "hotmal.com"); null otherwise. */
export function emailSuggestion(email: string): string | null {
  const value = email.trim().toLowerCase()
  const at = value.lastIndexOf("@")
  if (at < 1 || !SHAPE.test(value)) return null
  const domain = value.slice(at + 1)
  if (KNOWN.has(domain) || (COMMON_DOMAINS as readonly string[]).includes(domain)) return null
  let best: { domain: string; d: number } | null = null
  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate)
    if (d <= 2 && (!best || d < best.d)) best = { domain: candidate, d }
  }
  return best ? `${value.slice(0, at)}@${best.domain}` : null
}
