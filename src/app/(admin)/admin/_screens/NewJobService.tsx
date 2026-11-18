"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AdminData, ServiceItem } from "@/lib/admin/types"
import { routePeople } from "@/lib/admin/people"
import { serviceCost } from "@/lib/services"
import { FIELD, LABEL, choiceReady, newCustomerFrom, type CustomerChoice } from "./CustomerPicker"
import type { NewVisitInput, VisitActions } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { TIME_CHOICES } from "./visit-panel-model"

// The service half of New job: the day up front (it may stay empty: the job waits on the Schedule's Unscheduled list and
// nothing is sent), then the time, the minutes (the service's own), who, the price (the service's rule, editable) and the
// notes under "More details". Adding it makes the job and its first visit; with a day and a customer who can be texted,
// the date goes out.

/** What the service costs, from its rule: "$145", "$95 up to 6 zones, +$10 a zone", "Free", or "Quote on site". */
export function servicePriceLine(s: Pick<ServiceItem, "price" | "includedZones" | "extraZonePrice">): string {
  if (s.price === undefined) return "Quote on site"
  if (s.price === 0) return "Free"
  if (s.includedZones && s.extraZonePrice) return `$${s.price} up to ${s.includedZones} zones, +$${s.extraZonePrice} a zone`
  return `$${s.price}`
}

interface Props {
  data: AdminData
  today: string
  choice: CustomerChoice
  service: ServiceItem
  actions?: VisitActions
  onDone: (visitId: string) => void
}

export function NewJobService({ data, today, choice, service, actions, onDone }: Props) {
  const todayDay = today.slice(0, 10)
  // No day until one is chosen: a job taken by phone can be given its day later, and a day filled in by default booked today by accident.
  const [day, setDay] = useState("")
  const [time, setTime] = useState("")
  const [minutes, setMinutes] = useState<string | null>(null)
  const [personId, setPersonId] = useState("")
  const [price, setPrice] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const { pending, error, run } = useRunner()
  // A service with a per-zone rule asks for the zones so the prefilled price follows them; the zones go no further than this box.
  const banded = service.includedZones !== undefined
  const [zones, setZones] = useState<string | null>(null)
  const shownZones = zones ?? String(service.includedZones ?? "")
  const zoneCount = Math.min(16, Math.max(1, Number(shownZones) || service.includedZones || 1))
  const ruled = banded ? serviceCost(service, zoneCount) : service.price
  const shownPrice = price ?? (ruled !== undefined ? String(ruled) : "")
  const shownMinutes = minutes ?? String(service.slotMinutes)
  const people = routePeople(data.settings.people)
  const ready = choiceReady(choice, data.clients)

  const submit = () => {
    const accessLine = choice.isNew && choice.person.access.trim() ? `Access: ${choice.person.access.trim()}` : ""
    const text = [notes.trim(), accessLine].filter(Boolean).join("\n")
    const input: NewVisitInput = {
      ...(choice.isNew ? { newCustomer: newCustomerFrom(choice.person) } : { customerId: choice.chosen }),
      serviceKey: service.key,
      ...(day ? { scheduledOn: day } : {}),
      ...(day && time ? { startTime: time } : {}),
      durationMinutes: Number(shownMinutes),
      ...(personId ? { personId } : {}),
      ...(shownPrice ? { price: Number(shownPrice) } : {}),
      ...(text ? { notes: text } : {}),
    }
    if (!actions) return console.info("new job", input)
    run(
      () => actions.createVisit(input),
      ({ id }) => onDone(id),
    )
  }

  return (
    <>
      <div>
        <label htmlFor="nj-day" className={LABEL}>
          Day (optional)
        </label>
        <Input id="nj-day" type="date" value={day} min={todayDay} onChange={(e) => setDay(e.target.value)} className="min-h-11" />
      </div>

      {banded && (
        <div>
          <label htmlFor="nj-zones" className={LABEL}>
            Zones
          </label>
          <Input id="nj-zones" type="number" min={1} max={16} inputMode="numeric" value={shownZones} onChange={(e) => setZones(e.target.value)} className="min-h-11" />
        </div>
      )}

      <details className="rounded-lg border border-border p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">More details</summary>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nj-time" className={LABEL}>
              Time
            </label>
            <select id="nj-time" value={time} disabled={!day} onChange={(e) => setTime(e.target.value)} className={FIELD}>
              <option value="">Any time</option>
              {TIME_CHOICES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nj-minutes" className={LABEL}>
              Minutes
            </label>
            <Input id="nj-minutes" inputMode="numeric" value={shownMinutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
          </div>
          <div>
            <label htmlFor="nj-person" className={LABEL}>
              Who
            </label>
            <select id="nj-person" value={personId} onChange={(e) => setPersonId(e.target.value)} className={FIELD}>
              <option value="">First on the schedule</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nj-price" className={LABEL}>
              Price
            </label>
            <Input id="nj-price" inputMode="numeric" value={shownPrice} placeholder="Quote later" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
          </div>
          <div className="col-span-2">
            <label htmlFor="nj-notes" className={LABEL}>
              Notes
            </label>
            <Textarea id="nj-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
      </details>

      <div>
        <Button type="button" className="min-h-11" disabled={pending || !ready} onClick={submit}>
          Add job
        </Button>
        <p role="alert" className={`${FORM_STATUS} mt-2 text-destructive`}>
          {error}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {day ? "With a day, the customer is told the date by text, or by email with no mobile number." : "No day yet, nothing is sent. The job waits on the Schedule's Unscheduled list."}
        </p>
      </div>
    </>
  )
}
