import type { LucideIcon } from "lucide-react"
import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

// The ONE notice: a line (or two) that tells you something about the screen you are on, with a tint for how much it matters, an optional icon and an optional action at the right
// (docs/plans/2026-11-25-admin-audit-patterns.md, F15 and B7). Before this file the same strip was typed in four blocks, with a /10 tint in one and a /14 in another.
//   info     orange tint, foreground text: something is waiting on the customer or on you (an invoice sent)
//   warning  gold tint: a thing that needs a look but stops nothing (texts paused, unpaid)
//   error    red tint: a thing that is wrong or a person to be careful with (past due, do not service)
//   success  green tint: it is done (paid in full)
//   neutral  grey: a settled fact that needs nothing (refunded)
//   page     a white card with a shadow: the one line a record page carries above its band ("This job is canceled.", an archived request), the notice slot of `RecordPage`
// These are the status pill's tones, with the same ink on the same tint, so a notice and a pill on one screen read as one system. A notice is a statement, never a toast: it stays while it is true.
// `role="status"` for one that appears or changes while the screen is open; leave it off for one that is simply part of the page. Pure props, server-safe.

export type NoticeTone = "info" | "warning" | "error" | "success" | "neutral" | "page"

const TONE: Record<NoticeTone, string> = {
  info: "border-primary/30 bg-primary/10 text-foreground",
  warning: "border-warning/40 bg-warning/14 text-warning-ink",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-positive/30 bg-positive/10 text-positive-deep",
  neutral: "border-border bg-stone text-muted-foreground",
  page: "border-border bg-card px-5 py-3 font-medium text-foreground shadow-sm",
}

export interface NoticeProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  tone?: NoticeTone
  /** a mark at the start of the line, drawn at 16px and kept off the screen reader */
  icon?: LucideIcon
  /** a button or link at the right (it wraps under the text on a phone) */
  action?: ReactNode
  /** `section` for one that is labelled as a region (give it an `aria-label`); `p` for a plain line; `div` when the children are blocks */
  as?: "p" | "div" | "section"
  children: ReactNode
}

export function Notice({ tone = "info", icon: Icon, action, as: Tag = "p", className, children, ...rest }: NoticeProps) {
  const lead = Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
  return (
    <Tag data-slot="notice" data-tone={tone} className={cn("rounded-lg border px-3 py-2 text-sm", action ? "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3" : Icon && "flex items-start gap-2", TONE[tone], className)} {...rest}>
      {action ? (
        <>
          <span className={cn("min-w-0", Icon && "flex items-start gap-2")}>
            {lead}
            <span>{children}</span>
          </span>
          {action}
        </>
      ) : Icon ? (
        <>
          {lead}
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Tag>
  )
}
