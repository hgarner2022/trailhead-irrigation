"use client"

import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react"
import { cn } from "@/lib/utils"

// The one form row (docs/DESIGN.md, "The recipe"): the label above, the control (44px, from the library's Input, select or Textarea),
// the hint under it and the error under that. It makes the id that ties the label to the control, so a screen never writes a
// <label> of its own. Give it one control as the child (the id and aria-describedby are put on it) or pass `htmlFor` for a control
// that has its own id. Pure render.

export interface FormRowProps {
  label: string
  children: ReactNode
  /** the id of the control, when it has its own; otherwise the row gives its child one */
  htmlFor?: string
  /** one line under the control that says what goes in it */
  hint?: string
  /** what is wrong, in words; shown under the hint and announced */
  error?: string
  /** a label that is read but not drawn, for a control whose purpose is clear from the row it sits in */
  hideLabel?: boolean
  /** the record recipe's fact layout from `md` up: the label in a 112px column at the left of the control, the hint and error under the control; above the label as usual on a phone */
  inline?: boolean
  className?: string
}

export function FormRow({ label, children, htmlFor, hint, error, hideLabel, inline, className }: FormRowProps) {
  const made = useId()
  const id = htmlFor ?? made
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const described = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : null
  const control =
    !htmlFor && isValidElement(only)
      ? cloneElement(only as ReactElement<Record<string, unknown>>, { id, "aria-describedby": described, ...(error ? { "aria-invalid": true } : {}) })
      : children
  return (
    <div data-slot="form-row" className={cn("flex min-w-0 flex-col gap-1", inline && "md:grid md:grid-cols-[112px_minmax(0,1fr)] md:items-start md:gap-x-3", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium text-foreground", inline && "md:pt-2.5", hideLabel && "sr-only")}>
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className={cn("text-sm text-muted-foreground", inline && "md:col-start-2")}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={cn("text-sm text-destructive", inline && "md:col-start-2")}>
          {error}
        </p>
      )}
    </div>
  )
}
