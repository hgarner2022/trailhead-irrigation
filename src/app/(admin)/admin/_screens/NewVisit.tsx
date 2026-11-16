"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { KIND_LABEL, KIND_MINUTES, KIND_PRICE, OFFICE_KINDS, type OfficeKind } from "@/lib/admin/visit-defaults"
import type { AdminData } from "@/lib/admin/types"
import { CustomerPicker, FIELD, LABEL, choiceReady, emptyChoice, newCustomerFrom, type CustomerChoice } from "./CustomerPicker"
import type { NewVisitInput, VisitActions } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { TIME_CHOICES } from "./visit-panel-model"
import { useOpenVisit } from "./VisitPanelHost"

// New visit: a sheet that works in under a minute with a phone in the other hand. It needs only the customer, the
// kind and the day; the time, minutes, truck, price and notes sit under "More details" with the defaults from the
// spec (any time, the kind's minutes, the first truck, the kind's price where it is known, else quote later).
// Adding it makes the job and its first visit; with a day and a customer who can be texted, the date goes out.
// The customer block is shared with New pass (CustomerPicker.tsx), so the two sheets feel the same.

export { findCustomers } from "./CustomerPicker"

export interface NewVisitProps {
  data: AdminData
  /** ISO datetime; the day starts here */
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the customer already chosen, when it opens from a customer */
  customerId?: string
  actions?: VisitActions
}

export function NewVisit({ data, today, open, onOpenChange, customerId, actions }: NewVisitProps) {
  const openVisit = useOpenVisit()
  const todayDay = today.slice(0, 10)
  const [choice, setChoice] = useState<CustomerChoice>(emptyChoice(customerId))
  const [kind, setKind] = useState<OfficeKind>("repair")
  const [day, setDay] = useState(todayDay)
  const [time, setTime] = useState("")
  const [minutes, setMinutes] = useState<string | null>(null)
  const [truckId, setTruckId] = useState("")
  const [price, setPrice] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const { pending, error, run } = useRunner()
  const shownPrice = price ?? (KIND_PRICE[kind] ? String(KIND_PRICE[kind]) : "")
  const shownMinutes = minutes ?? String(KIND_MINUTES[kind])
  const trucks = data.settings.trucks
  const ready = choiceReady(choice, data.clients) && Boolean(day)

  const submit = () => {
    const accessLine = choice.isNew && choice.person.access.trim() ? `Access: ${choice.person.access.trim()}` : ""
    const text = [notes.trim(), accessLine].filter(Boolean).join("\n")
    const input: NewVisitInput = {
      ...(choice.isNew ? { newCustomer: newCustomerFrom(choice.person) } : { customerId: choice.chosen }),
      kind,
      scheduledOn: day,
      ...(time ? { startTime: time } : {}),
      durationMinutes: Number(shownMinutes),
      ...(truckId ? { truckId } : {}),
      ...(shownPrice ? { price: Number(shownPrice) } : {}),
      ...(text ? { notes: text } : {}),
    }
    if (!actions) return console.info("new visit", input)
    run(
      () => actions.createVisit(input),
      ({ id }) => {
        onOpenChange(false)
        openVisit?.(id)
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md" data-slot="new-visit">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-display text-2xl font-semibold text-navy">New visit</SheetTitle>
          <SheetDescription>Work taken by phone. It needs a customer, a kind and a day.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          <CustomerPicker data={data} customerId={customerId} value={choice} onChange={setChoice} idPrefix="nv" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nv-kind" className={LABEL}>
                Kind
              </label>
              <select id="nv-kind" value={kind} onChange={(e) => setKind(e.target.value as OfficeKind)} className={FIELD}>
                {OFFICE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nv-day" className={LABEL}>
                Day
              </label>
              <Input id="nv-day" type="date" value={day} min={todayDay} onChange={(e) => setDay(e.target.value)} className="min-h-11" />
            </div>
          </div>

          <details className="rounded-lg border border-border p-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">More details</summary>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nv-time" className={LABEL}>
                  Time
                </label>
                <select id="nv-time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD}>
                  <option value="">Any time</option>
                  {TIME_CHOICES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="nv-minutes" className={LABEL}>
                  Minutes
                </label>
                <Input id="nv-minutes" inputMode="numeric" value={shownMinutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
              </div>
              <div>
                <label htmlFor="nv-truck" className={LABEL}>
                  Truck
                </label>
                <select id="nv-truck" value={truckId} onChange={(e) => setTruckId(e.target.value)} className={FIELD}>
                  <option value="">First in service</option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="nv-price" className={LABEL}>
                  Price
                </label>
                <Input id="nv-price" inputMode="numeric" value={shownPrice} placeholder="Quote later" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
              </div>
              <div className="col-span-2">
                <label htmlFor="nv-notes" className={LABEL}>
                  Notes
                </label>
                <Textarea id="nv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
          </details>

          <div>
            <Button type="button" className="min-h-11" disabled={pending || !ready} onClick={submit}>
              Add visit
            </Button>
            <p role="alert" className={`${FORM_STATUS} mt-2 text-destructive`}>
              {error}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">With a day, the customer is told the date by text, or by email with no mobile number.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** The header's button: opens the sheet. */
export function NewVisitButton({ data, today, actions, customerId, label = "New visit", variant = "default" }: Omit<NewVisitProps, "open" | "onOpenChange"> & { label?: string; variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant={variant} className="min-h-11" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <NewVisit data={data} today={today} open={open} onOpenChange={setOpen} customerId={customerId} actions={actions} />
    </>
  )
}
