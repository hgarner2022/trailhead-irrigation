"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SERVICE_LIST } from "@/lib/services"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { CustomerPicker, FIELD, LABEL, emptyChoice, type CustomerChoice } from "./CustomerPicker"
import { NewJobPass, type NewPassInitial } from "./NewJobPass"
import { NewJobService, servicePriceLine } from "./NewJobService"
import type { VisitActions } from "./visit-actions-types"
import { useOpenRecord } from "./RecordHost"

// New job: one sheet for everything the office sells by phone or at the door. The customer, then "What are we doing?": the
// Season Pass first, then the active services, each with what the visit includes and its price from the rule under the
// select. A pass goes through `sellPass` (zones, days, how they pay); anything else through `createVisit` with the service's
// key. The customer block is shared (CustomerPicker.tsx). The services come from the screen's data (`data.services`, the
// active ones from `services.list`); the catalog's fixtures carry none and read the site's own list.

export { findCustomers } from "./CustomerPicker"

export const SEASON_PASS = "season-pass"
const PASS_LINE = "The spring turn-on and the fall blowout at standard per-zone rates, invoiced after each visit. The July inspection is an add-on."

export interface NewJobInitial {
  /** "season-pass" or a service key */
  choice?: string
  customer?: CustomerChoice
  pass?: NewPassInitial
}

export interface NewJobProps {
  data: AdminData
  /** ISO datetime; the day starts here and decides which pass visits are on sale */
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the customer already chosen, when it opens from a customer */
  customerId?: string
  actions?: VisitActions
  /** what the sheet opens with; the catalog's filled-in stories */
  initial?: NewJobInitial
  /** after Add job: the screen opens the record it shows; without it the new job's panel opens in place of the sheet */
  onCreated?: (made: { visitId: string; jobId: string }) => void
  /** opened from a day on the Schedule (yyyy-mm-dd): the sheet says "Tuesday, Nov 24" at the top and the day is set */
  day?: string
}

/** "Tuesday, Nov 24" from "2026-11-24". */
export const sheetDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })

/** The active services the sheet offers: the screen's own, else the site's catalogue. */
const offered = (data: AdminData): readonly ServiceItem[] => (data.services ?? (SERVICE_LIST as readonly ServiceItem[])).filter((s) => s.active !== false)

export function NewJob({ data, today, open, onOpenChange, customerId, actions, initial = {}, onCreated, day }: NewJobProps) {
  const host = useOpenRecord()
  const [choice, setChoice] = useState<CustomerChoice>(initial.customer ?? emptyChoice(customerId))
  const [what, setWhat] = useState(initial.choice ?? "")
  const services = useMemo(() => offered(data), [data])
  const service = services.find((s) => s.key === what)
  const isPass = what === SEASON_PASS
  const done = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md" data-slot="new-job">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-display text-2xl font-semibold text-navy">New job</SheetTitle>
          {day && (
            <p data-slot="new-job-day" className="text-sm font-medium text-foreground">
              {sheetDay(day)}
            </p>
          )}
          <SheetDescription>Work taken by phone or at the door. It needs a customer and what we are doing.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          <CustomerPicker data={data} customerId={customerId} value={choice} onChange={setChoice} emailRequired={isPass} idPrefix="nj" />

          <div>
            <label htmlFor="nj-what" className={LABEL}>
              What are we doing?
            </label>
            <select id="nj-what" value={what} onChange={(e) => setWhat(e.target.value)} className={FIELD}>
              <option value="" disabled>
                Choose one
              </option>
              <option value={SEASON_PASS}>Season Pass</option>
              {services.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
            {isPass && (
              <p data-slot="job-about" className="mt-2 text-sm text-muted-foreground">
                {PASS_LINE}
              </p>
            )}
            {service && (
              <div data-slot="job-about" className="mt-2 text-sm text-muted-foreground">
                {service.description && <p>{service.description}</p>}
                <p className="mt-1 font-medium text-foreground">{servicePriceLine(service)}</p>
              </div>
            )}
          </div>

          {isPass && <NewJobPass data={data} today={today} choice={choice} actions={actions} initial={initial.pass} onDone={done} />}
          {service && (
            <NewJobService
              key={service.key}
              data={data}
              today={today}
              choice={choice}
              service={service}
              actions={actions}
              initialDay={day}
              onDone={(made) => {
                done()
                if (onCreated) onCreated({ visitId: made.id, jobId: made.jobId })
                else host?.open("job", made.jobId)
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** The header's and the customer panel's button: opens the sheet. */
export function NewJobButton({ data, today, actions, customerId, onCreated, day, label = "New job", variant = "default" }: Omit<NewJobProps, "open" | "onOpenChange" | "initial"> & { label?: string; variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant={variant} className="min-h-11" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <NewJob data={data} today={today} open={open} onOpenChange={setOpen} customerId={customerId} actions={actions} onCreated={onCreated} day={day} />
    </>
  )
}
