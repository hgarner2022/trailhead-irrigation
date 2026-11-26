"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { FooterSlotContext } from "./record-slot"
import { TextLink } from "./TextLink"

// The frame of a record that is a page of its own (docs/DESIGN.md, "The recipe"; the rules are in
// docs/plans/2026-11-19-admin-page-layout-research.md): the job and, later, the customer. On the cream canvas, top to bottom: the header
// (crumb, the title in the display face with its status badge beside it, one muted line, and the actions at the top right from `lg`), a
// notice, the summary band, then the body in two columns, the main column (what the work is) and a 320px aside (who and where), each a stack
// of `SectionCard`s. On a phone everything is one column in that order and the actions become one bar pinned to the bottom, above the shell's tab bar (`--admin-tabbar-h`, which the shell sets on a phone) so the last row of buttons is never behind it. The actions are
// one `RecordFooter` (primary, outlines, More, the destructive one inside More); it provides the footer slot, so beat two puts its button there.
// Pure props, nothing fetched.

export interface RecordPageProps {
  title: string
  /** one muted line; says what the record is, never what a badge says */
  subtitle?: string
  /** the status badges beside the title: one or two `StatusPill size="lg"` */
  badges?: ReactNode
  /** the list this page belongs to, as a crumb above the title: Jobs */
  crumb?: { label: string; href: string }
  /** a line of status or a refusal under the header */
  notice?: ReactNode
  /** the `SummaryBand` */
  band?: ReactNode
  /** the aside's cards: Customer, Property, Notes and history */
  aside?: ReactNode
  /** the aside's accessible name; "About this job" by default */
  asideLabel?: string
  /** a `RecordFooter` with `destructiveInMenu`; nothing when the page has no buttons */
  actions?: ReactNode
  /** the main column's `SectionCard`s */
  children?: ReactNode
  className?: string
}

export function RecordPage({ title, subtitle, badges, crumb, notice, band, aside, asideLabel = "About this job", actions, children, className }: RecordPageProps) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  return (
    <FooterSlotContext.Provider value={{ element, setElement }}>
      <article data-slot="record-page" aria-labelledby="record-page-title" className={cn("mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-6 gap-y-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto]", className)}>
        <header data-slot="record-page-header" className="flex min-w-0 flex-col gap-1 lg:col-start-1 lg:row-start-1">
          {crumb && (
            <TextLink href={crumb.href} className="-ml-1 flex w-fit gap-0 px-1 text-sm">
              <span aria-hidden>‹&nbsp;</span>
              {crumb.label}
            </TextLink>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 id="record-page-title" className="type-admin-title text-navy">
              {title}
            </h1>
            {badges && (
              <span data-slot="record-page-badges" className="inline-flex flex-wrap items-center gap-2">
                {badges}
              </span>
            )}
          </div>
          {subtitle && <p className="type-admin-meta text-muted-foreground">{subtitle}</p>}
        </header>
        {actions && (
          <div
            data-slot="record-page-actions"
            className="sticky bottom-[var(--admin-tabbar-h,0px)] z-10 order-last -mx-4 border-t border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6 lg:static lg:order-none lg:col-start-2 lg:row-start-1 lg:mx-0 lg:self-end lg:border-0 lg:bg-transparent lg:p-0"
          >
            {actions}
          </div>
        )}
        {(notice || band) && (
          <div className="flex flex-col gap-4 lg:col-span-2">
            {notice}
            {band}
          </div>
        )}
        <div data-slot="record-page-body" className="grid items-start gap-4 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div data-slot="record-page-main" className="flex min-w-0 flex-col gap-4">
            {children}
          </div>
          {aside && (
            <aside data-slot="record-page-aside" aria-label={asideLabel} className="flex min-w-0 flex-col gap-4">
              {aside}
            </aside>
          )}
        </div>
      </article>
    </FooterSlotContext.Provider>
  )
}
