"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { emailProblem, emailSuggestion } from "@/lib/email-check"
import { formatPhone } from "@/lib/format/contact"
import type { AdminData, Client, Town } from "@/lib/admin/types"

// The customer block New visit and New pass share: find one of the app's customers by name, street or phone, or add a new
// one (name, street, town, phone, email, access note). The email gets the same slip check as the checkout ("gmail.con"
// is offered as "gmail.com", never forced). A sheet that needs the email (New pass: the confirmation and the pass card go
// by email) says so, and asks it of an existing customer who has none on file. Pure render over `CustomerChoice`.

export const TOWNS: Town[] = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]
export const FIELD = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
export const LABEL = "mb-1 block text-sm font-medium text-foreground"
const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "")

export interface Person {
  firstName: string
  lastName: string
  address: string
  town: Town
  email: string
  phone: string
  access: string
}

export const EMPTY_PERSON: Person = { firstName: "", lastName: "", address: "", town: "Erie", email: "", phone: "", access: "" }

/** What the block holds: the customer picked, or the new one being typed, and the email typed for a customer who has none. */
export interface CustomerChoice {
  chosen?: string
  isNew: boolean
  person: Person
  query: string
  /** for an existing customer with no email on file, when the sheet needs one */
  email: string
}

export const emptyChoice = (customerId?: string): CustomerChoice => ({ chosen: customerId, isNew: false, person: EMPTY_PERSON, query: "", email: "" })

/** The customers a name, a street or a phone matches, the first few. Only the app's own customers can have a visit or a pass added. */
export function findCustomers(clients: Client[], query: string, limit = 6): Client[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const d = digits(q)
  return clients
    .filter((c) => c.app)
    .filter((c) => `${c.firstName} ${c.lastName ?? ""} ${c.address ?? ""}`.toLowerCase().includes(q) || (d.length >= 3 && digits(c.phone).includes(d)))
    .slice(0, limit)
}

export const fullName = (c: Pick<Client, "firstName" | "lastName">) => [c.firstName, c.lastName].filter(Boolean).join(" ")

/** Whether the block has a customer to go on: a chosen one (with an email where one is needed), or a new one with a name and a street. */
export function choiceReady(choice: CustomerChoice, clients: Client[], emailRequired = false): boolean {
  if (choice.isNew) {
    const p = choice.person
    return Boolean(p.firstName.trim() && p.lastName.trim() && p.address.trim()) && (!emailRequired || emailProblem(p.email) === null)
  }
  if (!choice.chosen) return false
  if (!emailRequired) return true
  const client = clients.find((c) => c.id === choice.chosen)
  return Boolean(client?.email) || emailProblem(choice.email) === null
}

/** The `newCustomer` the API takes, from what was typed. */
export function newCustomerFrom(person: Person) {
  return {
    firstName: person.firstName.trim(),
    lastName: person.lastName.trim(),
    ...(person.email.trim() ? { email: person.email.trim() } : {}),
    ...(person.phone.trim() ? { phone: person.phone.trim() } : {}),
    property: { address: person.address.trim(), town: person.town },
  }
}

/** The email box with the slip check under it: "Did you mean maya@gmail.com?" is one press away. */
function EmailField({ id, value, onChange, required, className }: { id: string; value: string; onChange: (email: string) => void; required: boolean; className?: string }) {
  const suggestion = emailSuggestion(value)
  const problem = required && value.trim() ? emailProblem(value) : null
  return (
    <div className={className}>
      <Input id={id} aria-label="Email" type="email" placeholder={required ? "Email, for the confirmation" : "Email"} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11" aria-invalid={problem ? true : undefined} />
      {suggestion && (
        <Button type="button" variant="ghost" className="mt-1 min-h-11 px-2 text-primary-dark underline underline-offset-2" onClick={() => onChange(suggestion)}>
          {`Did you mean ${suggestion}?`}
        </Button>
      )}
      <p className="mt-1 text-sm text-destructive empty:hidden">{problem ?? ""}</p>
    </div>
  )
}

export interface CustomerPickerProps {
  data: AdminData
  /** the customer already chosen, when the sheet opens from a customer: the block shows them and offers no change */
  customerId?: string
  value: CustomerChoice
  onChange: (next: CustomerChoice) => void
  /** the sheet needs an email: the new-customer box says so and an existing customer with none is asked for one */
  emailRequired?: boolean
  /** a prefix for the field ids, so two sheets on one page never share one */
  idPrefix: string
}

export function CustomerPicker({ data, customerId, value, onChange, emailRequired = false, idPrefix }: CustomerPickerProps) {
  const { chosen, isNew, person, query } = value
  const matches = useMemo(() => findCustomers(data.clients, query), [data.clients, query])
  const client = data.clients.find((c) => c.id === chosen)
  const setPerson = (next: Partial<Person>) => onChange({ ...value, person: { ...person, ...next } })
  return (
    <fieldset data-slot="customer-picker">
      <legend className={LABEL}>Customer</legend>
      {client && !isNew ? (
        <>
          <p className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
            <span>
              <span className="block font-medium">{fullName(client)}</span>
              <span className="block text-muted-foreground">{[client.address, client.town].filter(Boolean).join(", ")}</span>
            </span>
            {!customerId && (
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => onChange({ ...value, chosen: undefined })}>
                Change
              </Button>
            )}
          </p>
          {emailRequired && !client.email && (
            <div className="mt-2">
              <label htmlFor={`${idPrefix}-email`} className={LABEL}>
                Email
              </label>
              <EmailField id={`${idPrefix}-email`} value={value.email} onChange={(email) => onChange({ ...value, email })} required />
              <p className="mt-1 text-sm text-muted-foreground">{`${client.firstName} has no email on file. The confirmation goes by email.`}</p>
            </div>
          )}
        </>
      ) : isNew ? (
        <div className="grid grid-cols-2 gap-3">
          <Input aria-label="First name" placeholder="First name" value={person.firstName} onChange={(e) => setPerson({ firstName: e.target.value })} className="min-h-11" />
          <Input aria-label="Last name" placeholder="Last name" value={person.lastName} onChange={(e) => setPerson({ lastName: e.target.value })} className="min-h-11" />
          {/* Input wraps its element in a div, so the span goes on a wrapper of our own. */}
          <div className="col-span-2">
            <Input aria-label="Street" placeholder="Street" value={person.address} onChange={(e) => setPerson({ address: e.target.value })} className="min-h-11" />
          </div>
          <select aria-label="Town" value={person.town} onChange={(e) => setPerson({ town: e.target.value as Town })} className={FIELD}>
            {TOWNS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <Input aria-label="Phone" inputMode="tel" placeholder="Phone" value={person.phone} onChange={(e) => setPerson({ phone: e.target.value })} className="min-h-11" />
          <EmailField id={`${idPrefix}-new-email`} value={person.email} onChange={(email) => setPerson({ email })} required={emailRequired} className="col-span-2" />
          <div className="col-span-2">
            <Input aria-label="Access note" placeholder="Access note (gate code, dog)" value={person.access} onChange={(e) => setPerson({ access: e.target.value })} className="min-h-11" />
          </div>
        </div>
      ) : (
        <>
          <Input aria-label="Find a customer" placeholder="Name, street or phone" value={query} onChange={(e) => onChange({ ...value, query: e.target.value })} className="min-h-11" />
          <ul className="mt-1 divide-y divide-border">
            {matches.map((c) => (
              <li key={c.id}>
                <button type="button" className="flex min-h-11 w-full flex-col items-start justify-center py-1 text-left text-sm" onClick={() => onChange({ ...value, chosen: c.id })}>
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
        <Button type="button" variant="ghost" className="mt-1 min-h-11 px-2 text-primary-dark underline underline-offset-2" onClick={() => onChange({ ...value, isNew: !isNew })}>
          {isNew ? "Find an existing customer" : "New customer"}
        </Button>
      )}
    </fieldset>
  )
}
