"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { PortalCustomerType } from "@/api/v1/portal/schemas"
import { formatPhone } from "@/lib/format/contact"

// The two things a customer edits on Details: their own name and mobile, and the yard facts of a property. Each saves through a server action that
// answers `{ ok, message }`, so a failure is said in place and a save is confirmed. The email and the street address are shown, not edited here.

export type SaveResult = { ok: true } | { ok: false; message: string }
type Property = PortalCustomerType["properties"][number]

function useSave(onSave: () => Promise<SaveResult> | SaveResult | undefined) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const save = () =>
    start(async () => {
      setNote(null)
      try {
        const out = await onSave()
        setNote(out && out.ok === false ? { ok: false, text: out.message } : { ok: true, text: "Saved." })
      } catch {
        setNote({ ok: false, text: "We couldn't save that. Try again, or call or text Ryan at (970) 692-7270." })
      }
    })
  return { pending, note, save }
}

function Footer({ pending, note, label }: { pending: boolean; note: { ok: boolean; text: string } | null; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : label}
      </Button>
      {note && (
        <p role={note.ok ? "status" : "alert"} className={note.ok ? "text-base text-positive-deep" : "text-base text-destructive"}>
          {note.text}
        </p>
      )}
    </div>
  )
}

export function ContactForm({ customer, onSave }: { customer: Pick<PortalCustomerType, "firstName" | "lastName" | "phone">; onSave?: (fields: { firstName: string; lastName: string; phone: string }) => Promise<SaveResult> | SaveResult }) {
  const [firstName, setFirst] = useState(customer.firstName)
  const [lastName, setLast] = useState(customer.lastName ?? "")
  const [phone, setPhone] = useState(formatPhone(customer.phone))
  const { pending, note, save } = useSave(() => onSave?.({ firstName, lastName, phone }))
  return (
    <form
      data-slot="contact-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={firstName} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" required />
        <Input label="Last name" value={lastName} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
      </div>
      <Input label="Mobile" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      <Footer pending={pending} note={note} label="Save your details" />
    </form>
  )
}

export function YardForm({ property, onSave }: { property: Property; onSave?: (id: string, fields: Record<string, unknown>) => Promise<SaveResult> | SaveResult }) {
  const [zones, setZones] = useState(property.zones?.toString() ?? "")
  const [controller, setController] = useState(property.controller ?? "")
  const [backflow, setBackflow] = useState(property.backflowLocation ?? "")
  const [gateCode, setGateCode] = useState(property.gateCode ?? "")
  const [mustBeHome, setMustBeHome] = useState(property.mustBeHome)
  const [accessNote, setAccessNote] = useState(property.accessNote ?? "")
  const [contactName, setContactName] = useState(property.contactName ?? "")
  const [contactPhone, setContactPhone] = useState(formatPhone(property.contactPhone))
  const { pending, note, save } = useSave(() =>
    onSave?.(property.id, { zones: zones.trim() ? Number(zones) : null, controller, backflowLocation: backflow, gateCode, mustBeHome, accessNote, contactName, contactPhone }),
  )
  const id = (name: string) => `yard-${property.id}-${name}`
  return (
    <form
      data-slot="yard-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id={id("zones")} label="Zones" type="number" min={1} max={16} inputMode="numeric" value={zones} onChange={(e) => setZones(e.target.value)} />
        <div className="space-y-1.5">
          <Input id={id("controller")} label="Controller" value={controller} onChange={(e) => setController(e.target.value)} aria-describedby={id("controller-hint")} />
          <p id={id("controller-hint")} className="text-sm text-muted-foreground">
            For example, Rachio 3 or Hunter Pro-C.
          </p>
        </div>
        <div className="space-y-1.5">
          <Input id={id("backflow")} label="Backflow location" value={backflow} onChange={(e) => setBackflow(e.target.value)} aria-describedby={id("backflow-hint")} />
          <p id={id("backflow-hint")} className="text-sm text-muted-foreground">
            For example, left of the garage, or by the front hose bib.
          </p>
        </div>
        <Input id={id("gate")} label="Gate code" value={gateCode} onChange={(e) => setGateCode(e.target.value)} />
      </div>
      {/* the whole row is the label, so the tap target is 44px tall, not the 16px box */}
      <Label htmlFor={id("home")} data-slot="must-be-home" className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-base">
        <Checkbox id={id("home")} checked={mustBeHome} onCheckedChange={(v) => setMustBeHome(v === true)} />
        Tell Ryan someone needs to be home
      </Label>
      <Textarea id={id("note")} label="Access note" rows={3} value={accessNote} onChange={(e) => setAccessNote(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id={id("contact")} label="On-site contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        <Input id={id("contact-phone")} label="Contact phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
      </div>
      <Footer pending={pending} note={note} label="Save yard notes" />
    </form>
  )
}
