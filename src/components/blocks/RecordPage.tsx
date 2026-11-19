"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { RecordFacts, type RecordFact } from "./RecordPanel"
import { SectionHeading } from "./SectionHeading"
import { FooterSlotContext } from "./record-slot"

// The record panel's twin for a record that is a page of its own (docs/DESIGN.md, "The recipe"): the job. The same parts in the same order as
// `RecordPanel`: the header (the name in the display face, one muted subtitle that never repeats a pill, the pills under it, the phone as
// a tel link), the facts, the sections each under its `SectionHeading`, and the `RecordFooter` in a bar under the body. What differs is the
// room: from `lg` the facts sit in two columns side by side (When and Where), on a phone they stack. The footer bar sticks to the bottom
// of the screen. It provides the footer slot, so beat two ("How is this paid?") puts its one button in the bar. Pure props.

export interface RecordPageColumn {
  /** the heading over the column's facts: When, Where */
  heading: string
  rows: readonly RecordFact[]
}

export interface RecordPageProps {
  title: string
  /** one muted line; says what the record is, never what a pill says */
  subtitle?: string
  /** the status pills under the subtitle */
  pills?: ReactNode
  /** shown as a tel link beside the pills */
  phone?: { text: string; href: string }
  /** the list this page belongs to, as a crumb above the title: Jobs */
  crumb?: { label: string; href: string }
  /** a line of status or a refusal above the facts */
  notice?: ReactNode
  /** the fact columns, side by side from `lg` */
  columns?: readonly RecordPageColumn[]
  /** the sections, each with its SectionHeading */
  children?: ReactNode
  /** a `RecordFooter`; nothing when the page has no buttons */
  footer?: ReactNode
  className?: string
}

export function RecordPage({ title, subtitle, pills, phone, crumb, notice, columns = [], children, footer, className }: RecordPageProps) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  return (
    <FooterSlotContext.Provider value={{ element, setElement }}>
      <article data-slot="record-page" aria-labelledby="record-page-title" className={cn("mx-auto flex w-full max-w-5xl flex-col", className)}>
        <header className="flex flex-col gap-1 px-4 pb-4 pt-4 sm:px-6">
          {crumb && (
            <Link href={crumb.href} className="-ml-1 flex min-h-11 w-fit items-center rounded-sm px-1 text-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              {crumb.label}
            </Link>
          )}
          <h1 id="record-page-title" className="font-display text-3xl font-semibold leading-tight text-navy">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {(pills || phone) && (
            <div data-slot="record-page-pills" className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              {pills}
              {phone && (
                <a href={phone.href} className="flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <Phone className="size-4" aria-hidden />
                  {phone.text}
                </a>
              )}
            </div>
          )}
        </header>
        <div className="flex flex-col gap-6 border-t border-border px-4 py-4 sm:px-6">
          {notice}
          {columns.length > 0 && (
            <div data-slot="record-page-columns" className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              {columns.map((c) => (
                <section key={c.heading} aria-label={c.heading}>
                  <SectionHeading>{c.heading}</SectionHeading>
                  <RecordFacts rows={c.rows} />
                </section>
              ))}
            </div>
          )}
          {children}
        </div>
        {footer && (
          <div data-slot="record-page-footer" className="sticky bottom-0 z-10 border-t border-border bg-background px-4 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </article>
    </FooterSlotContext.Provider>
  )
}
