/** The visitor's address from the proxy's headers (Vercel sets both); only the checkout's rate limit reads it. The first `x-forwarded-for` entry is the client. */
export function clientIpFrom(h: { get(name: string): string | null }): string | undefined {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || undefined
}
