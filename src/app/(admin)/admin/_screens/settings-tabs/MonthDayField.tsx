"use client"

import { DayPopoverField } from "@/components/blocks/DayField"

// A date with no year: a month and a day that repeat every year, "04-15" (a service's bookable-from and bookable-to day). It is the one calendar in a popover (`DayPopoverField`, yearless: the days of
// one leap year, no weekday names), so a date is chosen the same way here as everywhere. An end that is empty reads "Open" (the end is open, and with both ends empty the service is bookable all year);
// "Clear the day" in the popover goes back to it. A leap year, so Feb 29 can be chosen and the span repeats yearly.

export interface MonthDayFieldProps {
  /** "MM-DD", or null when this end is open */
  value: string | null
  /** what the field is called to a screen reader: "Spring turn-on bookable from" */
  label: string
  /** the button's id, so a FormRow's label can point at it */
  id?: string
  onCommit: (value: string | null) => void
}

export function MonthDayField({ value, label, id, onCommit }: MonthDayFieldProps) {
  return <DayPopoverField id={id} label={label} value={value} onChange={onCommit} yearless empty="Open" clearable />
}
