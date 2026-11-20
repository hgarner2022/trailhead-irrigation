import { cn } from "@/lib/utils"

// "Do not service" (Hannah, Nov 20 2026, docs/plans/2026-11-19-customer-status-research.md, answer 5): a mark only, set by a checkbox in Edit
// details with an optional reason that stays in the history and is never shown to the customer. It blocks nothing. It shows as a small red tag
// wherever the customer shows (the customer's header, a Customers list row, a Cmd+K hit) and as a red dot on a customer chip; New job shows the
// line under the customer it was picked for. Red here is the one warning the app has for a person, so it is the destructive tone, a tint and an
// ink, not a status pill. Pure render, server component.

export const DO_NOT_SERVICE = "Do not service"

export function DoNotServiceTag({ reason, size = "md", className }: { reason?: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      data-slot="do-not-service-tag"
      title={reason ? `${DO_NOT_SERVICE}: ${reason}` : DO_NOT_SERVICE}
      className={cn("inline-flex items-center whitespace-nowrap rounded-md border border-destructive/30 bg-destructive/10 font-semibold text-destructive", size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm", className)}
    >
      {DO_NOT_SERVICE}
    </span>
  )
}

/** The warning under the customer New job picked: it names the reason and says the job can still be added. */
export function DoNotServiceLine({ reason, className }: { reason?: string; className?: string }) {
  return (
    <p data-slot="do-not-service-line" role="status" className={cn("rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive", className)}>
      Marked {DO_NOT_SERVICE}
      {reason ? `: ${reason}` : ""}. You can still add the job.
    </p>
  )
}
