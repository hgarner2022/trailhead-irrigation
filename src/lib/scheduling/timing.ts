// The days each timing preference names for one visit kind's window (Early season, Our recommended, Late season), pure.
//
// A kind with a recommended span (`RECOMMENDED_SPAN` in src/lib/settings/defaults.ts: the turn-on's is early to mid May, Hannah, Nov 23 2026) gets three parts around it: the days
// from the window's start to the day before the span, the span, and the days after it to the window's close. That only splits a window that has days before and after the
// span; any other window, and any kind with no span, returns null and the caller splits it in thirds as before.
import { RECOMMENDED_SPAN } from "@/lib/settings/defaults"

export type TimingRanges = Record<"earlier" | "recommended" | "later", { from: string; to: string }>

const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

export function timingRanges(kind: string | undefined, opens: string, closes: string): TimingRanges | null {
  const span = kind ? RECOMMENDED_SPAN[kind as keyof typeof RECOMMENDED_SPAN] : undefined
  if (!span) return null
  const year = opens.slice(0, 4)
  const from = `${year}-${span.from}`
  const to = `${year}-${span.to}`
  if (!(opens < from && closes > to)) return null
  return { earlier: { from: opens, to: shift(from, -1) }, recommended: { from, to }, later: { from: shift(to, 1), to: closes } }
}
