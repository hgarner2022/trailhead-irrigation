"use client"

import { cn } from "@/lib/utils"

// Account Details, "Marketing": two switches, off by default (customer-side design, Nov 19 2026). Each says in one quiet line that receipts and
// visit reminders come either way. Native buttons with role "switch", so Space and Enter work. Pure props.

const QUIET = "You'll still get receipts and visit reminders either way."

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex min-h-14 items-start justify-between gap-4 py-2">
      <span className="flex flex-col">
        <span className="text-base font-medium text-foreground">{label}</span>
        <span className="text-sm text-navy-light">{QUIET}</span>
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary-dark" : "bg-input")}>
        <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
      </button>
    </div>
  )
}

export function MarketingSwitches({ email, text, onEmail, onText }: { email: boolean; text: boolean; onEmail: (on: boolean) => void; onText: (on: boolean) => void }) {
  return (
    <fieldset data-slot="marketing-switches" className="mt-8">
      <legend className="mb-1 font-display text-2xl font-semibold text-navy">Marketing</legend>
      <div className="divide-y divide-border">
        <Row label="Marketing emails" on={email} onChange={onEmail} />
        <Row label="Marketing texts" on={text} onChange={onText} />
      </div>
    </fieldset>
  )
}
