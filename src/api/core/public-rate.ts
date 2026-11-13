import "server-only"

// A brake on the anonymous checkout, per client address and per email. It lives in the instance's memory (the `api_call` table
// logs the public principal as one shared "checkout" id, so it cannot tell visitors apart): each serverless instance counts what it
// sees, which stops a script or a stuck double-click loop without a table to migrate. The per-key limits are far above what a
// person can do (the screens send a handful of calls a minute), and a call over the limit gets a plain "wait a minute".

export const PUBLIC_IP_PER_MINUTE = 20
export const PUBLIC_EMAIL_PER_MINUTE = 10
const WINDOW_MS = 60_000
const MAX_KEYS = 5000

const hits = new Map<string, number[]>()

/** Counts one hit for the key and says whether it is still within `limit` for the minute ending at `now`. */
function allow(key: string, limit: number, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > MAX_KEYS) for (const [k, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k)
  return true
}

/** True when this call from the public checkout is within the limits for its address and (when it names one) its email. */
export function publicCallAllowed(clientIp: string | undefined, email: string | undefined, now: Date): boolean {
  const t = now.getTime()
  const ip = clientIp ? allow(`ip:${clientIp}`, PUBLIC_IP_PER_MINUTE, t) : true
  const mail = email ? allow(`email:${email.trim().toLowerCase()}`, PUBLIC_EMAIL_PER_MINUTE, t) : true
  return ip && mail
}

/** Forgets every count; for tests. */
export function resetPublicRate(): void {
  hits.clear()
}
