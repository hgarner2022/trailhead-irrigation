"use client"

import { useState, type HTMLAttributes, type ReactElement, type ReactNode } from "react"
import { BellRing, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"
import { SegmentedControl } from "./SegmentedControl"
import { SidePanel } from "./SidePanel"
import type { NotToldVisit, UnscheduledJob } from "./scheduler-panels-types"
import { sortJobs, type UnscheduledSort } from "./unscheduled-model"

// The Schedule's side list of jobs with no day (docs/plans/2026-11-25-scheduler-design.md, 7.6 and 7.8): the count in the heading, a sort (Oldest, Newest, Name), and per row the
// customer, town, service and length with a "Schedule" button (which opens the one Schedule dialog) and, when the job has one, a quiet line with the suggested day, time and person. A second tab, "Not notified", lists visits that moved while the customer has
// not been notified, each with Notify the customer and Don't notify and one "Notify all" in the footer. A docked SidePanel: beside the week from 1280, a sheet from the bottom below. A row reports the pointer or
// focus on it through `onHover(id | null)` so the map and the calendar can light the same job, and takes `dragProps` for the calendar's drag library (nothing is installed here): the props are
// spread on the row and the row is marked `data-draggable`. Pure props, client component.

export interface UnscheduledPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: readonly UnscheduledJob[]
  notTold?: readonly NotToldVisit[]
  /** the tab shown first */
  defaultTab?: "unscheduled" | "not-notified"
  defaultSort?: UnscheduledSort
  onSortChange?: (sort: UnscheduledSort) => void
  /** the row's Schedule button: the host opens the Schedule dialog for this job */
  onSchedule: (job: UnscheduledJob) => void
  /** the pointer or focus is on a row (its id) or has left it (null) */
  onHover?: (id: string | null) => void
  /** the id of the job the map or calendar is lighting, drawn as hovered */
  hoverId?: string | null
  /** props for the drag source of a row, from the calendar's drag library; the row is marked draggable when this is given */
  dragProps?: (id: string) => HTMLAttributes<HTMLElement>
  /** wraps the row's words (not its button) in the calendar's drag source, `ExternalJobDraggable`: a button cannot sit inside a drag handle */
  dragWrap?: (job: UnscheduledJob, words: ReactElement) => ReactNode
  onNotify?: (visit: NotToldVisit) => void
  onDontTell?: (visit: NotToldVisit) => void
  onNotifyAll?: () => void
  className?: string
}

const words = (job: UnscheduledJob) => (
  <span className="min-w-0 flex-1 text-sm">
    <span className="block truncate font-medium text-foreground">{`${job.customer} · ${job.town}`}</span>
    <span className="block text-muted-foreground">{`${job.service} · ${job.length}`}</span>
    {job.suggestion && <span data-slot="suggestion" className="block text-muted-foreground">{job.suggestion}</span>}
  </span>
)

const SORTS = [
  { value: "oldest", label: "Oldest" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
] as const

export function UnscheduledPanel({ open, onOpenChange, jobs, notTold = [], defaultTab = "unscheduled", defaultSort = "oldest", onSortChange, onSchedule, onHover, hoverId, dragProps, dragWrap, onNotify, onDontTell, onNotifyAll, className }: UnscheduledPanelProps) {
  const [tab, setTab] = useState(defaultTab)
  const [sort, setSort] = useState<UnscheduledSort>(defaultSort)
  const rows = sortJobs(jobs, sort)
  const hover = (id: string | null) => ({ onMouseEnter: () => onHover?.(id), onMouseLeave: () => onHover?.(null), onFocus: () => onHover?.(id), onBlur: () => onHover?.(null) })
  const footer = tab === "not-notified" && notTold.length > 0 && onNotifyAll ? (
    <Button type="button" className="min-h-11" onClick={onNotifyAll}>
      Notify all
    </Button>
  ) : undefined
  return (
    <SidePanel variant="docked" open={open} onOpenChange={onOpenChange} title={`Unscheduled (${jobs.length})`} footer={footer} className={className}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-3">
        <TabsList className="group-data-[orientation=horizontal]/tabs:h-11 w-full">
          <TabsTrigger value="unscheduled" className="min-h-9">Unscheduled</TabsTrigger>
          <TabsTrigger value="not-notified" className="min-h-9">{`Not notified ${notTold.length}`}</TabsTrigger>
        </TabsList>

        <TabsContent value="unscheduled" className="flex flex-col gap-3">
          {jobs.length === 0 ? (
            <EmptyState title="Every job has a day." line="A job with no day waits here until you schedule it." className="py-8" />
          ) : (
            <>
              <SegmentedControl
                label="Sort"
                options={SORTS}
                value={sort}
                onChange={(v) => {
                  setSort(v as UnscheduledSort)
                  onSortChange?.(v as UnscheduledSort)
                }}
              />
              <ol data-slot="unscheduled-list" className="divide-y divide-border">
                {rows.map((job) => (
                  <li
                    key={job.id}
                    data-slot="unscheduled-row"
                    data-job={job.id}
                    data-draggable={dragProps ? "true" : undefined}
                    data-hover={hoverId === job.id || undefined}
                    {...dragProps?.(job.id)}
                    {...hover(job.id)}
                    className={cn("flex items-center gap-2 py-2.5", dragProps && "cursor-grab", hoverId === job.id && "bg-stone")}
                  >
                    {dragProps && <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                    {dragWrap ? dragWrap(job, words(job)) : words(job)}
                    <Button type="button" size="sm" variant="outline" className="min-h-11 shrink-0" aria-label={`Schedule ${job.customer}`} onClick={() => onSchedule(job)}>
                      Schedule
                    </Button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </TabsContent>

        <TabsContent value="not-notified">
          {notTold.length === 0 ? (
            <EmptyState icon={BellRing} title="Every customer has been notified." line="A moved visit waits here until you notify the customer or decide not to." className="py-8" />
          ) : (
            <ol data-slot="not-told-list" className="divide-y divide-border">
              {notTold.map((v) => (
                <li key={v.id} data-slot="not-told-row" data-hover={hoverId === v.id || undefined} {...hover(v.id)} className={cn("flex flex-col gap-2 py-3", hoverId === v.id && "bg-stone")}>
                  <span className="text-sm">
                    <span className="block truncate font-medium text-foreground">{`${v.customer} · ${v.town}`}</span>
                    <span className="block text-muted-foreground">{v.service}</span>
                    <span className="block text-muted-foreground">{`${v.was} to ${v.now}`}</span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className="min-h-11" aria-label={`Notify the customer ${v.customer}`} onClick={() => onNotify?.(v)}>
                      Notify the customer
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="min-h-11" aria-label={`Don't notify ${v.customer}`} onClick={() => onDontTell?.(v)}>
                      {"Don't notify"}
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </SidePanel>
  )
}
