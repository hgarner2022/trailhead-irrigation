import type { ReactNode } from "react"
import type { Person } from "@/lib/admin/types"
import type { BlockAction } from "./TimeBlock"
import type { GridBlock, Target, TimeOff } from "./time-grid-model"

/** One day of the clock; the people shown are split inside it (Week: seven of these; Day: one, with a column per person). */
export interface GridColumn {
  /** YYYY-MM-DD */
  day: string
  /** "Tue 24" */
  label: string
  today?: boolean
  /** "2 visits": the small count chip under the day */
  count?: string
  /** a line under the label, such as the day's fill ("5 stops, 3 h open"); Day view */
  caption?: string
  /** "Erie 3, Lafayette 2": the towns in the day, under the caption */
  towns?: string
  /** each person's own open time and driving for the day, by person id, shown under their name */
  stats?: Record<string, ColumnStat>
}

/** One person's day in the head: "3 h open" or "Full", and "38 min driving". */
export interface ColumnStat { open?: string; driving?: string }

export interface MoveEvent extends Target {
  id: string
  /** what the drop breaks, in words, for the host's "Move anyway?"; null when nothing */
  conflict: string | null
}
export interface ExternalDrop extends Target { id: string; conflict: string | null }
export interface ResizeEvent { id: string; minutes: number }
export interface CreateAtEvent { day: string; personId: string; start: number }
export interface TimeOffDragEvent { day: string; personId: string; start: number; end: number }

export interface TimeGridProps {
  /** the people shown, in column order */
  people: readonly Person[]
  /** the whole list in colour order, when `people` is only some of it (Week, one person); defaults to `people` */
  allPeople?: readonly Person[]
  columns: readonly GridColumn[]
  blocks: readonly GridBlock[]
  /** visits with a day and no time */
  anytime?: readonly GridBlock[]
  timeOff?: readonly TimeOff[]
  /** today's clock: the line is drawn on that day only */
  now?: { day: string; minutes: number }
  selectedId?: string
  hoverId?: string
  /** proposals: each block sits at its new place with a dotted edge, and `planned` holds the place it comes from */
  planned?: readonly GridBlock[]
  /** the minutes of driving to a block from the stop before it, by block id; a quiet line is drawn in the gap between two timed stops */
  drives?: ReadonlyMap<string, number>
  /** show each person's name over their column (Day) instead of their initials (Week) */
  showPersonNames?: boolean
  /** the mark for a customer not told; the other agent's bell goes here */
  notToldMark?: (block: GridBlock) => ReactNode
  /** a draggable row from outside the grid dropped on the clock */
  onDropExternal?: (drop: ExternalDrop) => void
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  onMove?: (move: MoveEvent) => void
  onResize?: (resize: ResizeEvent) => void
  onCreateAt?: (at: CreateAtEvent) => void
  onTimeOffDrag?: (span: TimeOffDragEvent) => void
  /** a time off band's label was pressed: the host opens it to edit or remove it */
  onTimeOffClick?: (id: string) => void
  /** the phone's Today chip at the end of the day strip: the host goes to today's week */
  onToday?: () => void
  /** the block menu's "Move" and "Set a time" (the host opens its dialog or picker); the others are handled here */
  onAction?: (id: string, action: BlockAction) => void
  className?: string
}
