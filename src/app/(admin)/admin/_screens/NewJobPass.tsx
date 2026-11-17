"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { MAX_ZONES, MIN_ZONES, visitPrice, visitsOnSale, type SeasonPassVisit } from "@/lib/season-pass"
import type { AdminData } from "@/lib/admin/types"
import { FIELD, LABEL, choiceReady, newCustomerFrom, type CustomerChoice } from "./CustomerPicker"
import type { NewPassInput, VisitActions } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { dayLabel } from "./visit-panel-model"

// The pass half of New job (docs/plans/2026-11-16-office-sells-a-pass.md): zones and the July add-on with the prices under
// them, a day per visit (blank is No day yet), how the money comes, the terms box, Sell pass. The pass is active when the
// call returns; the sheet closes and the toast says the pass number. The customer block above it is the sheet's.

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
}

interface Props {
  data: AdminData
  today: string
  choice: CustomerChoice
  actions?: VisitActions
  initial?: NewPassInitial
  onDone: () => void
}

export function NewJobPass({ data, today, choice, actions, initial = {}, onDone }: Props) {
  const toast = useUndoToast()
  const todayDay = today.slice(0, 10)
  // The zones start at what the chosen customer's property says it has; whatever the office picks wins over that.
  const [picked, setZones] = useState<number | undefined>(initial.zones)
  const propertyZones = choice.isNew ? undefined : data.clients.find((c) => c.id === choice.chosen)?.properties?.find((p) => p.zones)?.zones
  const zones = picked ?? (propertyZones ? Math.min(MAX_ZONES, Math.max(MIN_ZONES, propertyZones)) : 8)
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
        onDone()
        toast(`Pass ${sold.number} sold. ${sold.firstName} gets the confirmation by email.`)
      },
    )
  }

  return (
    <>
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
                <label htmlFor={`nj-day-${v.key}`} className={LABEL}>
                  {NAMES[v.key]}
                </label>
                <Input id={`nj-day-${v.key}`} type="date" value={day} min={todayDay} onChange={(e) => setDays({ ...days, [v.key]: e.target.value })} className="min-h-11" />
                <p className="mt-1 text-sm text-muted-foreground">{day ? dayLabel(day) : "No day yet"}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">A day is given to a person like a move. A day that is not open moves to the next open one, and the confirmation says so.</p>
      </fieldset>

      <fieldset>
        <legend className={LABEL}>Pays by</legend>
        <div className="flex flex-col gap-2">
          {PAYS_BY.map((p) => (
            <label key={p.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <input type="radio" name="nj-pays-by" value={p.value} checked={paysBy === p.value} onChange={() => setPaysBy(p.value)} className="size-4 accent-primary" />
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
        <p className="mt-2 text-sm text-muted-foreground">The pass is active at once. The customer gets the confirmation with the pass card, the days and, with a card, the link to add it. It needs an email.</p>
      </div>
    </>
  )
}
