/**
 * The "3 hours ago" under each NeedsAttention row, kept pure so the stories
 * and tests can fix `now`. Whole units only, the largest that fits: minutes
 * under an hour, hours under a day, then days. Under a minute, and any time
 * in the future, reads "just now".
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`

export function relativeTime(since: string, now: string): string {
  const elapsed = Date.parse(now) - Date.parse(since)
  if (!(elapsed >= MINUTE)) return "just now"
  if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), "minute")
  if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), "hour")
  return plural(Math.floor(elapsed / DAY), "day")
}
