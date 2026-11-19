"use client"

import type { ReactNode } from "react"
import { PageHeader } from "@/components/blocks/PageHeader"

// A screen the prototype does not have (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 2): never blank. It says what it is, that it
// is not part of this prototype, where the live one is, and carries one way on so nobody reaches a dead end. Pure props.

export interface PlaceholderProps {
  title: string
  /** the live screen's address: "/admin/schedule" */
  live?: string
  /** the line under the heading when it is not the usual one */
  line?: string
  /** one way on: links (chips) the page's own interceptor routes */
  children?: ReactNode
}

export function Placeholder({ title, live, line, children }: PlaceholderProps) {
  return (
    <div data-slot="walkthrough-placeholder">
      <PageHeader title={title} />
      <section aria-label={`${title}, not part of this prototype`} className="max-w-xl rounded-lg border border-dashed border-border bg-card p-6">
        <p className="text-sm font-semibold text-navy">Not part of this prototype</p>
        <p className="mt-1 text-sm text-muted-foreground">{line ?? (live ? `The live screen is ${live}.` : "The live app has this screen.")}</p>
        {children && <div className="mt-4 flex flex-col gap-1 text-sm">{children}</div>}
      </section>
    </div>
  )
}
