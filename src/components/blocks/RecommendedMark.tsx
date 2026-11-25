import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

// The mark on the ONE time the customer's day-and-time step recommends (docs/plans/2026-11-25-scheduler-design.md, 7.12). It never says why: no word about Ryan, a town, a route, being nearby or
// another visit, anywhere a customer can read. Three looks are drawn side by side for the owner to choose (`RecommendedMarkCandidates` story); the default is A, the design's recommendation.
//   A  the word "Recommended" in small text under the time (the word is its own accessible name)
//   B  a small star in the corner of the time button, named "Recommended time"
//   C  an outline on the button with the word "Suggested" above the time, named "Suggested time"
// A time button draws `<RecommendedMark position="before">`, its time, then `<RecommendedMark position="after">`, and adds `recommendedChip(look, checked)` to its own classes; each look draws in
// only the position it needs. Pure render, server component.

export type RecommendedLook = "A" | "B" | "C"

export const DEFAULT_LOOK: RecommendedLook = "A"

export interface RecommendedMarkProps {
  look?: RecommendedLook
  /** which side of the time this call draws: the mark is split so each look sits where it belongs */
  position: "before" | "after"
  /** the time is the chosen one (navy button), so the mark takes light ink */
  checked?: boolean
}

export function RecommendedMark({ look = DEFAULT_LOOK, position, checked = false }: RecommendedMarkProps) {
  if (look === "C" && position === "before")
    return (
      <span data-slot="recommended-mark" data-look="C" className={cn("text-xs font-semibold", checked ? "text-white/85" : "text-primary-deep")}>
        Suggested<span className="sr-only"> time</span>
      </span>
    )
  if (look === "A" && position === "after")
    return (
      <span data-slot="recommended-mark" data-look="A" className={cn("text-xs font-semibold", checked ? "text-white/85" : "text-primary-deep")}>
        Recommended
      </span>
    )
  if (look === "B" && position === "after")
    return (
      <span data-slot="recommended-mark" data-look="B" role="img" aria-label="Recommended time" className="absolute right-1 top-1">
        <Star aria-hidden className={cn("size-3.5", checked ? "fill-primary-light text-primary-light" : "fill-primary text-primary")} />
      </span>
    )
  return null
}

/** The classes a time button adds when it carries the mark: only look C changes the button itself, with an orange outline (the chosen button keeps its navy one). */
export const recommendedChip = (look: RecommendedLook = DEFAULT_LOOK, checked = false): string => (look === "C" && !checked ? "border-2 border-primary-dark" : "")

/** Whether the time button at `start` on `day` is the marked one: the start matches and, when a day is given, so does the day. */
export const isRecommended = (start: string, day: string, recommendedStart?: string | null, recommendedDay?: string | null): boolean => Boolean(recommendedStart) && start === recommendedStart && (!recommendedDay || recommendedDay === day)
