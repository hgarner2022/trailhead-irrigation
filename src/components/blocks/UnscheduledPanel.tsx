"use client"

import { useState, type HTMLAttributes, type ReactElement, type ReactNode } from "react"
import { GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { EmptyState } from "./EmptyState"
import { SegmentedControl } from "./SegmentedControl"
import { SidePanel } from "./SidePanel"
import type { UnscheduledJob } from "./scheduler-panels-types"
import { sortJobs, type UnscheduledSort } from "./unscheduled-model"

// The Schedule's side list of jobs with no day (docs/plans/2026-11-25-scheduler-design.md, 7.6): the count in the heading, a sort (Oldest, Newest, Name), and per row the
// customer, town, service and length with a "Schedule" button (which opens the one Schedule dialog) and, when the job has one, a quiet line with the suggested day, time and person;
// "Schedule all N" in the footer. A plain list: nothing about who was told is kept here. A docked SidePanel: beside the week from 1280, a sheet from the bottom below. A row reports the pointer or
// focus on it through `onHover(id | null)` so the map and the calendar can light the same job, and takes `dragProps` for the calendar's drag library (nothing is installed here): the props are
// spread on the row and the row is marked `data-draggable`. Pure props, client component.

export interface UnscheduledPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: readonly UnscheduledJob[]
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
  /** Schedule all N: the host opens its preview */
  onScheduleAll?: () => void
  className?: string
}

const words = (job: UnscheduledJob) => (
  <span className="type-admin-body min-w-0 flex-1">
    <span className="block break-words font-semibold text-foreground">{`${job.customer} · ${job.town}`}</span>
    <span className="block tabular-nums text-muted-foreground">{`${job.service} · ${job.length}`}</span>
    {job.suggestion && <span data-slot="suggestion" className="type-admin-meta mt-0.5 block tabular-nums text-muted-foreground">{job.suggestion}</span>}
  </span>
)

/** The list keeps the one order, oldest first, until it is long enough to need another. */
const SORT_FROM = 6
const SORTS = [
  { value: "oldest", label: "Oldest" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
] as const

export function UnscheduledPanel({ open, onOpenChange, jobs, defaultSort = "oldest", onSortChange, onSchedule, onHover, hoverId, dragProps, dragWrap, onScheduleAll, className }: UnscheduledPanelProps) {
  const [sort, setSort] = useState<UnscheduledSort>(defaultSort)
  const rows = sortJobs(jobs, sort)
  const hover = (id: string | null) => ({ onMouseEnter: () => onHover?.(id), onMouseLeave: () => onHover?.(null), onFocus: () => onHover?.(id), onBlur: () => onHover?.(null) })
  const footer = jobs.length > 1 && onScheduleAll ? (
    <Button type="button" variant="outline" size="touch" onClick={onScheduleAll}>
      {`Schedule all ${jobs.length}`}
    </Button>
  ) : undefined
  return (
    <SidePanel variant="docked" open={open} onOpenChange={onOpenChange} title={`Unscheduled (${jobs.length})`} footer={footer} className={className}>
      <div className="flex flex-col gap-3">
        {jobs.length === 0 ? (
          <EmptyState title="Every job has a day." line="A job with no day waits here until you schedule it." className="py-8" />
        ) : (
          <>
            {jobs.length > SORT_FROM && (
              <SegmentedControl
                label="Sort"
                options={SORTS}
                value={sort}
                onChange={(v) => {
                  setSort(v as UnscheduledSort)
                  onSortChange?.(v as UnscheduledSort)
                }}
              />
            )}
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
                  className={cn("-mx-2 flex items-center gap-2 rounded-md px-2 py-3 transition-colors duration-(--motion-fast) motion-reduce:transition-none", dragProps && "cursor-grab", hoverId === job.id && "bg-stone")}
                >
                  {dragProps && <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                  {dragWrap ? dragWrap(job, words(job)) : words(job)}
                  <Button type="button" size="touch-sm" variant="outline" className="shrink-0" aria-label={`Schedule ${job.customer}`} onClick={() => onSchedule(job)}>
                    Schedule
                  </Button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </SidePanel>
  )
}
