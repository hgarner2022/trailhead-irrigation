"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatPhone } from "@/lib/format/contact"
import { KIND_LABEL, KIND_MINUTES, KIND_PRICE, OFFICE_KINDS, type OfficeKind } from "@/lib/admin/visit-defaults"
import type { AdminData, Client, Town } from "@/lib/admin/types"
import type { NewVisitInput, VisitActions } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { TIME_CHOICES } from "./visit-panel-model"
import { useOpenVisit } from "./VisitPanelHost"

// New visit: a sheet that works in under a minute with a phone in the other hand. It needs only the customer, the
// kind and the day; the time, minutes, truck, price and notes sit under "More details" with the defaults from the
// spec (any time, the kind's minutes, the first truck, the kind's price where it is known, else quote later).
// Adding it makes the job and its first visit; with a day and a customer who can be texted, the date goes out.

const TOWNS: Town[] = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
const FIELD = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
const LABEL = "mb-1 block text-sm font-medium text-foreground"
const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "")

/** The customers a name, a street or a phone matches, the first few. Only the app's own customers can have a visit added. */
export function findCustomers(clients: Client[], query: string, limit = 6): Client[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const d = digits(q)
  return clients
    .filter((c) => c.app)
    .filter((c) => `${c.firstName} ${c.lastName ?? ""} ${c.address ?? ""}`.toLowerCase().includes(q) || (d.length >= 3 && digits(c.phone).includes(d)))
    .slice(0, limit)
}

const fullName = (c: Pick<Client, "firstName" | "lastName">) => [c.firstName, c.lastName].filter(Boolean).join(" ")

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
  const [chosen, setChosen] = useState<string | undefined>(customerId)
  const [query, setQuery] = useState("")
  const [isNew, setIsNew] = useState(false)
  const [person, setPerson] = useState({ firstName: "", lastName: "", address: "", town: "Erie" as Town, email: "", phone: "", access: "" })
  const [kind, setKind] = useState<OfficeKind>("repair")
  const [day, setDay] = useState(todayDay)
  const [time, setTime] = useState("")
  const [minutes, setMinutes] = useState<string | null>(null)
  const [truckId, setTruckId] = useState("")
  const [price, setPrice] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const { pending, error, run } = useRunner()
  const matches = useMemo(() => findCustomers(data.clients, query), [data.clients, query])
  const client = data.clients.find((c) => c.id === chosen)
  const shownPrice = price ?? (KIND_PRICE[kind] ? String(KIND_PRICE[kind]) : "")
  const shownMinutes = minutes ?? String(KIND_MINUTES[kind])
  const trucks = data.settings.trucks
  const ready = (isNew ? person.firstName.trim() && person.lastName.trim() && person.address.trim() : Boolean(chosen)) && Boolean(day)

  const submit = () => {
    const accessLine = isNew && person.access.trim() ? `Access: ${person.access.trim()}` : ""
    const text = [notes.trim(), accessLine].filter(Boolean).join("\n")
    const input: NewVisitInput = {
      ...(isNew
        ? { newCustomer: { firstName: person.firstName.trim(), lastName: person.lastName.trim(), ...(person.email.trim() ? { email: person.email.trim() } : {}), ...(person.phone.trim() ? { phone: person.phone.trim() } : {}), property: { address: person.address.trim(), town: person.town } } }
        : { customerId: chosen }),
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
          <fieldset>
            <legend className={LABEL}>Customer</legend>
            {client && !isNew ? (
              <p className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <span>
                  <span className="block font-medium">{fullName(client)}</span>
                  <span className="block text-muted-foreground">{[client.address, client.town].filter(Boolean).join(", ")}</span>
                </span>
                {!customerId && (
                  <Button type="button" variant="ghost" className="min-h-11" onClick={() => setChosen(undefined)}>
                    Change
                  </Button>
                )}
              </p>
            ) : isNew ? (
              <div className="grid grid-cols-2 gap-3">
                <Input aria-label="First name" placeholder="First name" value={person.firstName} onChange={(e) => setPerson({ ...person, firstName: e.target.value })} className="min-h-11" />
                <Input aria-label="Last name" placeholder="Last name" value={person.lastName} onChange={(e) => setPerson({ ...person, lastName: e.target.value })} className="min-h-11" />
                <Input aria-label="Street" placeholder="Street" value={person.address} onChange={(e) => setPerson({ ...person, address: e.target.value })} className="col-span-2 min-h-11" />
                <select aria-label="Town" value={person.town} onChange={(e) => setPerson({ ...person, town: e.target.value as Town })} className={FIELD}>
                  {TOWNS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <Input aria-label="Phone" inputMode="tel" placeholder="Phone" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} className="min-h-11" />
                <Input aria-label="Email" type="email" placeholder="Email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} className="col-span-2 min-h-11" />
                <Input aria-label="Access note" placeholder="Access note (gate code, dog)" value={person.access} onChange={(e) => setPerson({ ...person, access: e.target.value })} className="col-span-2 min-h-11" />
              </div>
            ) : (
              <>
                <Input aria-label="Find a customer" placeholder="Name, street or phone" value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-11" />
                <ul className="mt-1 divide-y divide-border">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="flex min-h-11 w-full flex-col items-start justify-center py-1 text-left text-sm" onClick={() => setChosen(c.id)}>
                        <span className="font-medium">{fullName(c)}</span>
                        <span className="text-muted-foreground">{[c.address, c.town, c.phone ? formatPhone(c.phone) : ""].filter(Boolean).join(" · ")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {query.trim().length >= 2 && matches.length === 0 && <p className="mt-1 text-sm text-muted-foreground">No one found. Add them as a new customer.</p>}
              </>
            )}
            {!customerId && (
              <Button type="button" variant="link" className="mt-1 min-h-11 px-0" onClick={() => setIsNew(!isNew)}>
                {isNew ? "Find an existing customer" : "New customer"}
              </Button>
            )}
          </fieldset>

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
