import { forwardRef, type SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { focusRingClass } from "./option-styles"

// The ONE native select of the admin (docs/plans/2026-11-25-admin-audit-patterns.md, 1.7 d and B4). Before this file its classes were typed in eleven blocks under four names (`FIELD`, `SELECT`, ...), each a
// little different. It is the browser's own select, so a phone opens its own picker, with the product's field look around it: 44px high (the Input's touch height), 16px text on a phone so iOS Safari
// does not zoom (14px from `md`, as `Input`), a 1px border like the Input's, and the shared keyboard focus ring (the browser's blue one is gone). The radix `ui/select` stays for what a native one
// cannot do; nothing in the admin used it.
//   density="compact": the Settings rows, 44 on a phone and 36 from `md`, as the inputs beside it.
// It fills its column like an `Input`; pass `className="w-auto"` for one that sits beside other things on a line. Give it a label through `FormRow`, or an `aria-label` when it has none.

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  density?: "default" | "compact"
  /** the field's problem is showing: a red border, and `aria-invalid` for the screen reader */
  invalid?: boolean
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField({ density = "default", invalid = false, className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      data-slot="select-field"
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-11 w-full cursor-pointer rounded-lg border bg-background px-3 text-base text-foreground md:text-sm disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-destructive" : "border-input",
        density === "compact" && "px-2 md:min-h-9",
        focusRingClass,
        className,
      )}
      {...rest}
    />
  )
})
