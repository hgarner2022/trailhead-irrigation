import { History } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SettingsChange } from "@/lib/admin/types"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { EmptyState } from "./EmptyState"

// Who changed which setting, when, and from what to what: one row per
// change, newest first, in the words the settings reducers wrote. Pure
// render, server component; the times are read in Mountain time.

export interface ChangeLogProps {
  changes: SettingsChange[]
  className?: string
}

const clock = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).toLowerCase()

export function ChangeLog({ changes, className }: ChangeLogProps) {
  if (changes.length === 0) {
    return <EmptyState className={className} icon={History} title="No changes yet" line="Every edit to the trucks, areas, windows and messages is listed here with who made it." />
  }
  // Newest first; entries with the same time keep the order they were logged in, latest on top.
  const newestFirst = changes.map((change, i) => ({ change, i })).sort((a, b) => (a.change.at < b.change.at ? 1 : a.change.at > b.change.at ? -1 : b.i - a.i)).map((x) => x.change)
  return (
    <ol data-slot="change-log" className={cn("divide-y divide-border", className)}>
      {newestFirst.map((change) => (
        <li key={change.id} className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:items-baseline sm:gap-4">
          <span className="shrink-0 text-muted-foreground sm:w-40">
            {change.who}
            <span className="text-muted-foreground/80">{` · `}</span>
            <time dateTime={change.at}>{`${shortDate(change.at, TIME_ZONE)}, ${clock(change.at)}`}</time>
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-medium text-foreground">{change.field}</span>
            <span className="text-muted-foreground">{` from `}</span>
            <span className="text-foreground">{change.from}</span>
            <span className="text-muted-foreground">{` to `}</span>
            <span className="text-foreground">{change.to}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
