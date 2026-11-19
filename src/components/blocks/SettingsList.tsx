import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { SettingsChange } from "@/lib/admin/types"
import { ChangeLog } from "./ChangeLog"
import { EmptyState } from "./EmptyState"
import { SectionHeading } from "./SectionHeading"

// The one list of the Settings screen (docs/plans/2026-11-18-admin-holistic-design.md, sections 8 and 9): a heading with the entry's
// one action at the right, a line of what the entry is for, then one row per thing (a person, a service, a key, a message, "Invoices"),
// each row a title with its buttons at the right and its facts under it as `FormRow inline`s (the recipe's 112px labels) with the
// control inline, then the change log under the list. A tab holds no markup of its own for a list. Every control inside commits when
// it is left, so an edit is one logged line; the screen's SaveBar writes them all. Pure render, no state.

export interface SettingsRow {
  id: string
  title: ReactNode
  /** a quiet line under the title: an email, "Takes visits" */
  subtitle?: ReactNode
  /** buttons at the right of the title: Remove, Revoke */
  aside?: ReactNode
  /** the facts: `FormRow inline`s, or any one block (Messages' textarea) */
  children: ReactNode
  /** one fact per line instead of two columns from `lg`: a row whose facts are wide */
  single?: boolean
}

export interface SettingsListProps {
  /** the entry's name, the h2 under the page's h1 */
  title: string
  /** what the entry is for, one line */
  description?: ReactNode
  /** the entry's one action: Add person, Create key */
  action?: ReactNode
  rows: SettingsRow[]
  /** what shows when there are no rows */
  empty?: { title: string; line: string }
  /** the log under the list, newest first; left out, no log is drawn */
  changes?: SettingsChange[]
  className?: string
}

export function SettingsList({ title, description, action, rows, empty, changes, className }: SettingsListProps) {
  return (
    <section data-slot="settings-list" aria-labelledby="settings-list-title" className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <SectionHeading level={2} id="settings-list-title">
            {title}
          </SectionHeading>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {rows.length === 0 ? (
        empty ? (
          <EmptyState title={empty.title} line={empty.line} />
        ) : null
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((row) => (
            <li key={row.id} data-slot="settings-row" className="space-y-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <SectionHeading level={3}>{row.title}</SectionHeading>
                  {row.subtitle && <p className="text-sm text-muted-foreground">{row.subtitle}</p>}
                </div>
                {row.aside && <div className="flex shrink-0 items-center gap-2">{row.aside}</div>}
              </div>
              <div className={cn("grid gap-x-8 gap-y-4", !row.single && "lg:grid-cols-2")}>{row.children}</div>
            </li>
          ))}
        </ul>
      )}
      {changes && (
        <section aria-labelledby="settings-changes" className="space-y-2 pt-2">
          <SectionHeading id="settings-changes">Changes</SectionHeading>
          <ChangeLog changes={changes} />
        </section>
      )}
    </section>
  )
}
