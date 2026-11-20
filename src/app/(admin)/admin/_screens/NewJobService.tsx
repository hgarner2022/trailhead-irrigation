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
import { asksZones, defaultZones, zoneCountOf, type ServiceGroup } from "./new-job-model"

// The service half of New job: the day up front (it may stay empty: the job waits on the Schedule's Unscheduled list and
// nothing is sent), then the time, the minutes (the service's own), who, the price (the service's rule, editable) and the
// notes under "More details". Adding it makes the job and its first visit; with a day and a customer who can be texted,
// the date goes out. The service is one entry; `service` is the band the zones box lands on, and its key is what is sent.

/** What the service costs, from its rule: "$145", "$95 up to 6 zones, then $10 a zone", "Free", or "Quote on site". */
export function servicePriceLine(s: Pick<ServiceItem, "price" | "includedZones" | "extraZonePrice">): string {
  if (s.price === undefined) return "Quote on site"
  if (s.price === 0) return "Free"
  if (s.includedZones && s.extraZonePrice) return `$${s.price} up to ${s.includedZones} zones, then $${s.extraZonePrice} a zone`
  return `$${s.price}`
}

interface Props {
  data: AdminData
  today: string
  choice: CustomerChoice
  /** the service as one entry, with its bands */
  group: ServiceGroup
  /** the band the zones land on */
  service: ServiceItem
  /** what is typed in the zones box (null until touched), kept by the sheet so the price line under the picker follows it */
  zones: string | null
  onZones: (zones: string) => void
  actions?: VisitActions
  /** the day the sheet was opened from, on the Schedule */
  initialDay?: string
  /** offers "Add and send a quote" beside "Add job" */
  quotes?: boolean
  /** `quote`: the job was made with "Add and send a quote" */
  onDone: (made: { id: string; jobId: string }, quote?: boolean) => void
}

export function NewJobService({ data, today, choice, group, service, zones, onZones, actions, initialDay, quotes, onDone }: Props) {
  const todayDay = today.slice(0, 10)
  // No day until one is chosen: a job taken by phone can be given its day later, and a day filled in by default booked today by accident.
  const [day, setDay] = useState(initialDay ?? "")
  const [time, setTime] = useState("")
  const [minutes, setMinutes] = useState<string | null>(null)
  const [personId, setPersonId] = useState("")
  const [price, setPrice] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const { pending, error, run } = useRunner()
  // A service with bands or a per-zone rule asks for the zones: they pick the band and the prefilled price follows them; the zones go no further than this box.
  const banded = asksZones(group)
  const shownZones = zones ?? String(defaultZones(group))
  const zoneCount = zoneCountOf(shownZones, group)
  const ruled = banded ? serviceCost(service, zoneCount) : service.price
  const shownPrice = price ?? (ruled !== undefined ? String(ruled) : "")
  const shownMinutes = minutes ?? String(service.slotMinutes)
  const people = routePeople(data.settings.people)
  const ready = choiceReady(choice, data.clients)
  // The catalogue decides (Hannah, Nov 20 2026): a service with no price is quoted first, so "Add and send a quote" leads and "Add job" makes a job that reads
  // Needs a quote; a priced service leads with Add job.
  const quoteFirst = Boolean(quotes) && service.price === undefined

  const submit = (quote = false) => {
    const accessLine = choice.isNew && choice.person.access.trim() ? `Access: ${choice.person.access.trim()}` : ""
    const text = [notes.trim(), accessLine].filter(Boolean).join("\n")
    const input: NewVisitInput = {
      ...(choice.isNew ? { newCustomer: newCustomerFrom(choice.person) } : { customerId: choice.chosen }),
      serviceKey: service.key,
      ...(day && !quote ? { scheduledOn: day } : {}),
      ...(day && time && !quote ? { startTime: time } : {}),
      ...(quote ? { sendQuote: true } : {}),
      durationMinutes: Number(shownMinutes),
      ...(personId ? { personId } : {}),
      ...(shownPrice ? { price: Number(shownPrice) } : {}),
      ...(text ? { notes: text } : {}),
    }
    if (!actions) return console.info("new job", input)
    run(
      () => actions.createVisit(input),
      (made) => onDone(made, quote),
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
          <Input id="nj-zones" type="number" min={1} max={16} inputMode="numeric" value={shownZones} onChange={(e) => onZones(e.target.value)} className="min-h-11" />
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
        <div data-slot="new-job-actions" className="flex flex-wrap gap-2">
          {quoteFirst && (
            <Button type="button" className="min-h-11" disabled={pending || !ready} onClick={() => submit(true)}>
              Add and send a quote
            </Button>
          )}
          <Button type="button" variant={quoteFirst ? "outline" : "default"} className="min-h-11" disabled={pending || !ready} onClick={() => submit()}>
            Add job
          </Button>
          {quotes && !quoteFirst && (
            <Button type="button" variant="outline" className="min-h-11" disabled={pending || !ready} onClick={() => submit(true)}>
              Add and send a quote
            </Button>
          )}
        </div>
        <p role="alert" className={`${FORM_STATUS} mt-2 text-destructive`}>
          {error}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {quoteFirst
            ? "Needs a price before it can be scheduled. The job opens as Needs a quote with no day, and nothing is sent until you send the quote."
            : day
              ? `With a day, the customer is told the date by text, or by email with no mobile number.${quotes ? " A quote opens with no day." : ""}`
              : "No day yet, nothing is sent. The job waits on the Schedule's Unscheduled list."}
        </p>
      </div>
    </>
  )
}
