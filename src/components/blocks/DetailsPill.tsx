import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// The one sign that something opens in place on the customer's screens: a small pill that says what a press does, "Details" (stone) and, once open, "Hide" (navy), with a chevron that turns.
// It is the service card's opener, lifted out so every disclosure wears it (a service card, a past season). It is never a control itself: the row it sits in is the button, and the pill is
// hidden from assistive technology, which reads the row's own expanded state. Give `open` when the parent holds the state; leave it out inside a native <details class="group"> and the pill
// follows the element's own open state with no script. Pure props, server-safe.

export const DETAILS = "Details"
export const HIDE = "Hide"

const PILL = "flex h-7 shrink-0 items-center gap-0.5 rounded-full pr-1.5 pl-3 text-xs font-semibold transition-colors"

export function DetailsPill({ open, className }: { open?: boolean; className?: string }) {
  if (open === undefined)
    return (
      <span data-slot="details-pill" aria-hidden className={cn(PILL, "bg-stone text-navy group-open:bg-navy group-open:text-white", className)}>
        <span className="group-open:hidden">{DETAILS}</span>
        <span className="hidden group-open:inline">{HIDE}</span>
        <ChevronDown className="svc-chevron size-4 group-open:rotate-180" />
      </span>
    )
  return (
    <span data-slot="details-pill" aria-hidden className={cn(PILL, open ? "bg-navy text-white" : "bg-stone text-navy", className)}>
      {open ? HIDE : DETAILS}
      <ChevronDown className={cn("svc-chevron size-4", open && "rotate-180")} />
    </span>
  )
}
