"use client"

import { MONTH_NAMES } from "@/lib/services-window"
import { CommitInput } from "./fields"

// A date with no year: a month and a day that repeat every year, "04-15". The month is a select whose first choice is none (the end is
// open, and with both ends empty the service is bookable all year); the day is a number that waits for a month. Picking a month with no
// day yet starts on the 1st. Changing the month keeps the day, cut back to the month's length (Feb 29 stays, the span repeats yearly).

const FIELD = "min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9"
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const two = (n: number) => String(n).padStart(2, "0")

export interface MonthDayFieldProps {
  /** "MM-DD", or null when this end is open */
  value: string | null
  /** what the controls are called to a screen reader: "Spring turn-on bookable from" */
  label: string
  /** the select's id, so a FormRow's label can point at it */
  id?: string
  onCommit: (value: string | null) => void
}

export function MonthDayField({ value, label, id, onCommit }: MonthDayFieldProps) {
  const month = value ? Number(value.slice(0, 2)) : 0
  const day = value ? Number(value.slice(3, 5)) : 1
  return (
    <div className="flex items-center gap-2">
      <select
        id={id}
        aria-label={`${label} month`}
        value={month}
        onChange={(e) => {
          const m = Number(e.target.value)
          onCommit(m === 0 ? null : `${two(m)}-${two(Math.min(day, DAYS_IN[m - 1]!))}`)
        }}
        className={FIELD}
      >
        <option value={0}>Open</option>
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <div className="w-20 shrink-0">
        {month === 0 ? (
          <input aria-label={`${label} day`} disabled className={`${FIELD} w-full`} placeholder="Day" />
        ) : (
          <CommitInput type="number" min={1} max={DAYS_IN[month - 1]} label={`${label} day`} value={day} onCommit={(v) => onCommit(`${two(month)}-${two(Number(v))}`)} />
        )}
      </div>
    </div>
  )
}
