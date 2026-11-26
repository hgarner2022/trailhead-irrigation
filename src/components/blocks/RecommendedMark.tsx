import { cn } from "@/lib/utils"

// The mark on the ONE time the customer's day-and-time step recommends (docs/plans/2026-11-25-scheduler-design.md, 7.12; the owner's pick of Nov 26 2026 in
// docs/plans/2026-11-26-scheduler-review-research.md): the word "Recommended" in small text under the time, which is its own accessible name ("10:30 am, Recommended"), on a
// phone and to a screen reader alike. It stays when the time is chosen, has no tooltip, and never says why: no word about Ryan, a town, a route, being nearby or another visit,
// anywhere a customer can read. A time button draws it after its time. Pure render, server component.

export interface RecommendedMarkProps {
  /** the time is the chosen one (navy button), so the mark takes light ink */
  checked?: boolean
}

export function RecommendedMark({ checked = false }: RecommendedMarkProps) {
  return (
    <span data-slot="recommended-mark" className={cn("text-xs font-semibold", checked ? "text-white/85" : "text-primary-deep")}>
      Recommended
    </span>
  )
}

/** Whether the time button at `start` on `day` is the marked one: the start matches and, when a day is given, so does the day. */
export const isRecommended = (start: string, day: string, recommendedStart?: string | null, recommendedDay?: string | null): boolean => Boolean(recommendedStart) && start === recommendedStart && (!recommendedDay || recommendedDay === day)
