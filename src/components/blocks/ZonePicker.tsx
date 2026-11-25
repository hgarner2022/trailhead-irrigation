"use client"

import { useState } from "react"
import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { optionClass } from "./option-styles"

// How many zones the system has (the booking form's service card): "6 or fewer", then 7 to 12 as quick picks, and "More than 12" which opens a number box for the exact count (Hannah, Nov 22 2026:
// "They could have a lot. After the 12th it's probably the same pricing", so above 12 the price is the catalogue's per-zone rule and there is no new band). The count decides the price and the visit's
// length. 44px buttons that wrap, each pressed state read aloud; the number box is a plain numeric input labelled "Number of zones". Controlled; pure props, client component.

export const FEW = 6
export const MANY_FROM = 13
export const MAX_ZONE_COUNT = 99

export interface ZonePickerProps {
  value: number
  onChange: (zones: number) => void
  className?: string
}

const CHIP = "flex min-h-11 min-w-11 items-center justify-center px-3 font-display text-xl tabular-nums"
/** the one option style (option-styles.ts), at this block's size */
const chip = (selected: boolean) => cn(optionClass({ selected }), CHIP)

export function ZonePicker({ value, onChange, className }: ZonePickerProps) {
  const [many, setMany] = useState(value >= MANY_FROM)
  const [text, setText] = useState(value >= MANY_FROM ? String(value) : "")
  const quick = Array.from({ length: MANY_FROM - 1 - FEW }, (_, i) => FEW + 1 + i)
  const pick = (zones: number) => {
    setMany(false)
    onChange(zones)
  }
  const type = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2)
    setText(digits)
    // The count counts from the first valid number; an empty or small number leaves the last good count in place until it is fixed.
    if (digits !== "" && +digits >= MANY_FROM) onChange(Math.min(+digits, MAX_ZONE_COUNT))
  }
  return (
    <div data-slot="zone-picker" className={cn("space-y-3", className)}>
      <div role="group" aria-label="Zones" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!many && value <= FEW} onClick={() => pick(FEW)} className={chip(!many && value <= FEW)}>
          6 or fewer
        </button>
        {quick.map((zones) => (
          <button key={zones} type="button" aria-pressed={!many && value === zones} aria-label={`${zones} zones`} onClick={() => pick(zones)} className={chip(!many && value === zones)}>
            {zones}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={many}
          onClick={() => {
            setMany(true)
            setText(String(Math.max(value, MANY_FROM)))
            onChange(Math.max(value, MANY_FROM))
          }}
          className={chip(many)}
        >
          More than 12
        </button>
      </div>
      {many && (
        <FormRow label="Number of zones" className="max-w-48">
          <Input name="zones" inputMode="numeric" value={text} onChange={(e) => type(e.target.value)} onBlur={() => setText(String(Math.max(value, MANY_FROM)))} className="h-11 rounded-lg bg-background px-3 text-base tabular-nums shadow-sm" />
        </FormRow>
      )}
    </div>
  )
}
