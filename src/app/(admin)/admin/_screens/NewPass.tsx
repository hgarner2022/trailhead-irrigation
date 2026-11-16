"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { MAX_ZONES, MIN_ZONES, visitPrice, visitsOnSale, type SeasonPassVisit } from "@/lib/season-pass"
import type { AdminData } from "@/lib/admin/types"
import { CustomerPicker, FIELD, LABEL, choiceReady, emptyChoice, newCustomerFrom, type CustomerChoice } from "./CustomerPicker"
import type { NewPassInput, VisitActions } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { dayLabel } from "./visit-panel-model"

// New pass: the office sells a Season Pass by phone or at the door, on New visit's bones (docs/plans/2026-11-16-office-
// sells-a-pass.md). Customer (email required: the confirmation and the pass card go by email), zones and the July
// add-on with the prices under them, a day per visit (blank is No day yet), how the money comes, the terms box, Sell
// pass. The pass is active when the call returns; the sheet closes and the toast says the pass number.

const NAMES: Record<SeasonPassVisit["key"], string> = { "turn-on": "Spring turn-on", inspection: "July inspection", blowout: "Fall blowout" }
const ZONE_CHOICES = Array.from({ length: MAX_ZONES - MIN_ZONES + 1 }, (_, i) => MIN_ZONES + i)
export type PaysBy = NewPassInput["paysBy"]
const PAYS_BY: { value: PaysBy; label: string }[] = [
  { value: "card-link", label: "Card on file, we email a link to add it" },
  { value: "at-visit", label: "At each visit, check, Venmo or cash" },
]

/** "Spring turn-on $145 · Fall blowout $95 · billed after each visit", with the July inspection between them when it is ticked. */
export function priceLine(zones: number, inspection: boolean, today: string): string {
  return [...visitsOnSale(inspection, today).map((v) => `${NAMES[v.key]} $${visitPrice(v, zones)}`), "billed after each visit"].join(" · ")
}

export interface NewPassInitial {
  zones?: number
  inspection?: boolean
  days?: NewPassInput["days"]
  paysBy?: PaysBy
  termsAccepted?: boolean
  customer?: CustomerChoice
}

export interface NewPassProps {
  data: AdminData
  /** ISO datetime; the day starts here and decides which visits are on sale */
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the customer already chosen, when it opens from a customer */
  customerId?: string
  actions?: VisitActions
  /** what the sheet opens with; the catalog's filled-in story */
  initial?: NewPassInitial
}

export function NewPass({ data, today, open, onOpenChange, customerId, actions, initial = {} }: NewPassProps) {
  const toast = useUndoToast()
  const todayDay = today.slice(0, 10)
  const [choice, setChoice] = useState<CustomerChoice>(initial.customer ?? emptyChoice(customerId))
  const [zones, setZones] = useState(initial.zones ?? 8)
  const [inspection, setInspection] = useState(initial.inspection ?? false)
  const [days, setDays] = useState<NewPassInput["days"]>(initial.days ?? {})
  const [paysBy, setPaysBy] = useState<PaysBy>(initial.paysBy ?? "card-link")
  const [terms, setTerms] = useState(initial.termsAccepted ?? false)
  const { pending, error, run } = useRunner()
  const onSale = visitsOnSale(inspection, todayDay)
  const ready = choiceReady(choice, data.clients, true) && terms

  const submit = () => {
    const accessNote = choice.isNew && choice.person.access.trim() ? choice.person.access.trim() : ""
    const chosen = data.clients.find((c) => c.id === choice.chosen)
    const input: NewPassInput = {
      ...(choice.isNew ? { newCustomer: { ...newCustomerFrom(choice.person), ...(accessNote ? { accessNote } : {}) } } : { customerId: choice.chosen, ...(chosen?.email ? {} : { email: choice.email.trim() }) }),
      zones,
      inspection,
      days: Object.fromEntries(Object.entries(days).filter(([, day]) => day)),
      paysBy,
      termsAccepted: true,
    }
    if (!actions) return console.info("sell pass", input)
    run(
      () => actions.sellPass(input),
      (sold) => {
        onOpenChange(false)
        toast(`Pass ${sold.number} sold. ${sold.firstName} gets the confirmation by email.`)
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md" data-slot="new-pass">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-display text-2xl font-semibold text-navy">New pass</SheetTitle>
          <SheetDescription>A Season Pass sold by phone or at the door. It needs a customer with an email, the zones and how they pay.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          <CustomerPicker data={data} customerId={customerId} value={choice} onChange={setChoice} emailRequired idPrefix="np" />

          <fieldset>
            <legend className={LABEL}>Zones and the July inspection</legend>
            <div className="grid grid-cols-2 gap-3">
              <select aria-label="Zones" value={zones} onChange={(e) => setZones(Number(e.target.value))} className={FIELD}>
                {ZONE_CHOICES.map((z) => (
                  <option key={z} value={z}>
                    {`${z} zones`}
                  </option>
                ))}
              </select>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="checkbox" checked={inspection} onChange={(e) => setInspection(e.target.checked)} className="size-4 accent-primary" />
                July inspection
              </label>
            </div>
            <p data-slot="pass-prices" className="mt-2 text-sm text-muted-foreground">
              {priceLine(zones, inspection, todayDay)}
            </p>
          </fieldset>

          <fieldset>
            <legend className={LABEL}>Days</legend>
            <div className="grid grid-cols-2 gap-3">
              {onSale.map((v) => {
                const day = days[v.key] ?? ""
                return (
                  <div key={v.key} className={onSale.length === 3 && v.key === "blowout" ? "col-span-2" : ""}>
                    <label htmlFor={`np-day-${v.key}`} className={LABEL}>
                      {NAMES[v.key]}
                    </label>
                    <Input id={`np-day-${v.key}`} type="date" value={day} min={todayDay} onChange={(e) => setDays({ ...days, [v.key]: e.target.value })} className="min-h-11" />
                    <p className="mt-1 text-sm text-muted-foreground">{day ? dayLabel(day) : "No day yet"}</p>
                  </div>
                )
              })}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">A day goes on a truck like a move. A day that is not open moves to the next open one, and the confirmation says so.</p>
          </fieldset>

          <fieldset>
            <legend className={LABEL}>Pays by</legend>
            <div className="flex flex-col gap-2">
              {PAYS_BY.map((p) => (
                <label key={p.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                  <input type="radio" name="np-pays-by" value={p.value} checked={paysBy === p.value} onChange={() => setPaysBy(p.value)} className="size-4 accent-primary" />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="size-4 accent-primary" required />
            Terms read and accepted
          </label>

          <div>
            <Button type="button" className="min-h-11" disabled={pending || !ready} onClick={submit}>
              Sell pass
            </Button>
            <p role="alert" className={`${FORM_STATUS} mt-2 text-destructive`}>
              {error}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">The pass is active at once. The customer gets the confirmation with the pass card, the days and, with a card, the link to add it.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** The header's and the customer panel's button: opens the sheet. */
export function NewPassButton({ data, today, actions, customerId, label = "New pass", variant = "outline" }: Omit<NewPassProps, "open" | "onOpenChange"> & { label?: string; variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant={variant} className="min-h-11" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <NewPass data={data} today={today} open={open} onOpenChange={setOpen} customerId={customerId} actions={actions} />
    </>
  )
}
