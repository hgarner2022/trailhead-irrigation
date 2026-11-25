"use client"

import { DayCalendar } from "@/components/blocks/DayCalendar"
import { visitsOnSale } from "@/lib/season-pass"
import { DAY_HEADINGS, withChoice, type DayKind, type Offers } from "./checkout-days"
import { RenewalExtras } from "./checkout-renewal"
import type { RenewalPrefill } from "./checkout-submit"
import type { StepProps } from "./checkout-steps"

// The "Your days" step: for each visit the pass holds, a short heading and the one calendar (`DayCalendar`, days only: a window is told the day before, never promised here), the soonest open day
// preselected and marked. A day is chosen by pressing it; the calendar is a real grid, so the arrow keys, Tab and Enter work, and Enter moves on like every other step. Under it, one line: it
// can be changed later.

export function DaysStep({ state, offers: loaded, set, renewal, attempted = false }: StepProps & { offers: Offers | null; renewal?: RenewalPrefill; attempted?: boolean }) {
  const kinds = visitsOnSale(state.inspection, state.today).map((v) => v.key as DayKind)
  if (loaded === null)
    return (
      <p role="status" data-slot="days-loading" className="text-base text-muted-foreground">
        Finding the open days in your town.
      </p>
    )
  const offers = loaded
  return (
    <div className="space-y-10">
      {kinds.map((kind, k) => {
        const list = offers[kind] ?? []
        const held = state.days.find((d) => d.kind === kind)
        return (
          <section key={kind} aria-label={DAY_HEADINGS[kind]} data-slot="days-group" data-kind={kind} className="min-w-0">
            <h2 className="font-display text-3xl leading-[1.05] text-navy">{DAY_HEADINGS[kind]}</h2>
            {list.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">We don&apos;t have an open day to show yet. Ryan sets this one and we text it to you.</p>
            ) : (
              <DayCalendar
                className="mt-4"
                headingLevel={3}
                timed={false}
                autoFocusDay={k === 0}
                offers={list.map((o) => ({ day: o.day, times: [] }))}
                value={{ day: held?.day ?? null, start: null }}
                onChange={(next) => {
                  const offer = list.find((o) => o.day === next.day)
                  if (offer) set("days", withChoice(state.days, offer, kind))
                }}
                legend={DAY_HEADINGS[kind]}
              />
            )}
          </section>
        )
      })}
      <p className="text-base text-muted-foreground">Change it later from your pass page.</p>
      <p className="text-base text-muted-foreground">{"We'll text you the time the day before."}</p>
      {renewal && <RenewalExtras state={state} set={set} renewal={renewal} attempted={attempted} />}
    </div>
  )
}
