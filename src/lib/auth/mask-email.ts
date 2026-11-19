/** "andrea@example.com" as "a***@example.com": enough to spot a typo, not enough for someone reading over a shoulder. Anything that is not an address is returned as typed. */
export function maskEmail(email: string): string {
  const value = email.trim()
  const at = value.lastIndexOf("@")
  if (at < 1 || at === value.length - 1) return value
  return `${value[0]}***${value.slice(at)}`
}
