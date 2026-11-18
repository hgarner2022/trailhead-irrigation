import { cn } from "@/lib/utils"
import type { MoneyState, WorkState } from "@/lib/admin/jobs"
import { areaBorder } from "./area-colours"
import { StatusPill } from "./StatusPill"

// One visit on Today (owner, 17 Nov 2026): the window it opens ("8 to 10 am"), the customer's first name and town over the
// service, the person's initials in a circle, the visit's pill and, once it is done, the
// money word at the right. The bar on the left is the visit's area in the colour the Schedule legend gives it. A Done row strikes
// the customer line through and keeps the service readable. The whole row is one 44px button that opens the visit; the
// screen supplies `onOpen`, so the block knows nothing of panels. Pure render apart from the click, a client component.

export interface TodayVisitRowProps {
  id: string
  /** "8 to 10 am", or "Any time" */
  window: string
  firstName: string
  town: string
  service: string
  personName: string
  initials: string
  /** the area's place in the list, for the bar; -1 for the quiet bar */
  areaIndex: number
  work: WorkState
  workLabel: string
  money: MoneyState
  /** "Paid, Venmo", "$95 unpaid", "Invoice sent": only on a Done visit */
  moneyWord: string
  /** the visit's place in its person's day, shown before the window when the list is by person */
  route?: number
  onOpen: (id: string) => void
  className?: string
}

export function TodayVisitRow({ id, window, firstName, town, service, personName, initials, areaIndex, work, workLabel, money, moneyWord, route, onOpen, className }: TodayVisitRowProps) {
  const done = work === "done"
  return (
    <li data-slot="today-visit-row" data-work={work} className={cn("border-l-4 bg-card", areaBorder(areaIndex), className)}>
      <button
        type="button"
        onClick={() => onOpen(id)}
        className="flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 sm:flex-nowrap"
      >
        {route !== undefined && (
          <span data-slot="route-number" className="w-5 shrink-0 text-sm font-semibold tabular-nums text-navy">
            <span className="sr-only">Stop </span>
            {route}
          </span>
        )}
        <span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">{window}</span>
        <span className="min-w-0 flex-1 basis-40 text-sm">
          <span className={cn("block truncate text-foreground", done && "line-through decoration-muted-foreground/60")}>
            {firstName}
            <span className="text-muted-foreground"> · {town}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{service}</span>
        </span>
        <span data-slot="person-initials" title={personName} className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-stone text-xs font-semibold text-navy">
          <span aria-hidden>{initials || "?"}</span>
          <span className="sr-only">{personName}</span>
        </span>
        <span className="ml-auto flex flex-wrap items-center justify-end gap-1 sm:min-w-44">
          <StatusPill status={work} label={workLabel} data-pill="work" />
          {moneyWord && <StatusPill status={money} label={moneyWord} data-pill="money" />}
        </span>
      </button>
    </li>
  )
}
