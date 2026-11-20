"use client"

import type { Problem } from "./booking-form-model"

// What is wrong with the step, summarised at the top of its card (docs/plans/2026-11-19-booking-form-design.md, "Navigation and close"): one line per problem in the same words as beside its field,
// each a button that sends focus to that field, in the order the fields appear. Shown only after Continue was pressed with something missing. Pure props, client component.

export function StepProblems({ problems }: { problems: readonly Problem[] }) {
  if (problems.length === 0) return null
  const go = (field: string) => document.querySelector<HTMLElement>(`[data-slot=flow-surface] ${field}`)?.focus()
  return (
    <div role="alert" id="step-problems" tabIndex={-1} data-slot="step-problems" className="mb-6 rounded-lg border border-destructive/40 bg-background p-4 outline-none">
      <p className="text-base font-semibold text-destructive">Check these before you continue</p>
      <ul className="mt-2 space-y-0.5">
        {problems.map((p) => (
          <li key={p.message}>
            <button type="button" onClick={() => go(p.field)} className="inline-flex min-h-11 cursor-pointer items-center text-left text-base text-destructive underline underline-offset-2">
              {p.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
