import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StatTile } from "./StatTile"

// Today's money strip (owner, 17 Nov 2026, after Jobber's "Today's appointments" figures): four figures with their labels, what
// is on today, what is done, what is still ahead and what the done visits still owe, and one button to today on the Schedule. Four across on a laptop with
// the button at the right; on a phone the figures wrap to two rows of two and the button runs full width under them. Pure
// render over figures already formatted, a server component.

export interface TodayMoneyFigure {
  label: string
  /** already formatted whole dollars, "$420" */
  value: string
}

export interface TodayMoneyProps {
  figures: TodayMoneyFigure[]
  /** where "View schedule" goes: that day on the Schedule */
  scheduleHref: string
  className?: string
}

export function TodayMoney({ figures, scheduleHref, className }: TodayMoneyProps) {
  return (
    <section data-slot="today-money" aria-labelledby="today-money" className={cn("flex flex-col gap-4 lg:flex-row lg:items-stretch", className)}>
      <h2 id="today-money" className="sr-only">
        Today&rsquo;s money
      </h2>
      <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
        {figures.map((figure) => (
          <StatTile key={figure.label} label={figure.label} value={figure.value} />
        ))}
      </div>
      <Button size="touch" asChild variant="outline" className="w-full lg:h-auto lg:w-auto lg:self-stretch lg:px-6">
        <Link href={scheduleHref}>
          <CalendarDays className="size-4" aria-hidden />
          View schedule
        </Link>
      </Button>
    </section>
  )
}
