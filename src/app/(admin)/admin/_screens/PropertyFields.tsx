"use client"

import { useState } from "react"
import { FormRow } from "@/components/blocks/FormRow"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Yard } from "@/lib/admin/types"
import type { VisitActions, YardChanges } from "./visit-actions-types"
import { propertyLines } from "./customers-model"
import { FORM_STATUS, useRunner } from "./use-runner"

// The customer panel's Property block: what is true about the yard, one line per fact that is set, and Edit, which opens the
// nine fields in place. Save sends only what changed through `properties.update`; a refusal shows in the API's words under
// the buttons. A tech (readOnly) sees no Edit, no gate code and no contact phone. Client component.

const FIELD = "min-h-11"

interface Draft {
  zones: string
  controller: string
  backflowLocation: string
  gateCode: string
  mustBeHome: boolean
  accessNote: string
  contactName: string
  contactPhone: string
  notes: string
}

const draftOf = (y: Yard): Draft => ({
  zones: y.zones ? String(y.zones) : "", controller: y.controller ?? "", backflowLocation: y.backflowLocation ?? "", gateCode: y.gateCode ?? "", mustBeHome: y.mustBeHome,
  accessNote: y.accessNote ?? "", contactName: y.contactName ?? "", contactPhone: y.contactPhone ?? "", notes: y.notes ?? "",
})

/** What the form changed, as `properties.update` takes it: the text fields trimmed, an emptied one null (it clears), zones a number or null. */
export function yardChanges(was: Yard, draft: Draft): YardChanges {
  const before = draftOf(was)
  const changes: YardChanges = {}
  if (draft.zones !== before.zones) changes.zones = draft.zones.trim() ? Number(draft.zones) : null
  if (draft.mustBeHome !== before.mustBeHome) changes.mustBeHome = draft.mustBeHome
  for (const key of ["controller", "backflowLocation", "gateCode", "accessNote", "contactName", "contactPhone", "notes"] as const) {
    if (draft[key] !== before[key]) changes[key] = draft[key].trim() || null
  }
  return changes
}

export interface PropertyFieldsProps {
  propertyId: string
  yard: Yard
  actions?: VisitActions
  onDone: () => void
  onCancel: () => void
}

export function PropertyFields({ propertyId, yard, actions, onDone, onCancel }: PropertyFieldsProps) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(yard))
  const { pending, error, run } = useRunner()
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const text = (key: Exclude<keyof Draft, "mustBeHome" | "zones" | "accessNote" | "notes">, label: string, placeholder?: string, type = "text") => (
    <FormRow label={label}>
      <Input type={type} value={draft[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} className={FIELD} />
    </FormRow>
  )
  const area = (key: "accessNote" | "notes", label: string, placeholder: string) => (
    <FormRow label={label}>
      <Textarea value={draft[key]} placeholder={placeholder} rows={3} onChange={(e) => set(key, e.target.value)} />
    </FormRow>
  )
  const save = () => {
    const changes = yardChanges(yard, draft)
    if (!Object.keys(changes).length) return onDone()
    if (!actions) {
      console.info("update property", propertyId, changes)
      return onDone()
    }
    run(() => actions.updateProperty(propertyId, changes), onDone)
  }
  return (
    <form
      data-slot="property-fields"
      className="mt-2 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Zones">
          <Input type="number" inputMode="numeric" min={1} max={16} value={draft.zones} onChange={(e) => set("zones", e.target.value)} className={FIELD} />
        </FormRow>
        {text("controller", "Controller", "Rachio 3 in the garage")}
      </div>
      {text("backflowLocation", "Backflow", "North side of the house")}
      {text("gateCode", "Gate code")}
      <FormRow label="Must be home" htmlFor="property-must-be-home">
        <input id="property-must-be-home" type="checkbox" checked={draft.mustBeHome} onChange={(e) => set("mustBeHome", e.target.checked)} className="size-11 accent-primary md:size-5" />
      </FormRow>
      {area("accessNote", "Access note", "Gate code, dog, where the controller is")}
      <div className="grid grid-cols-2 gap-3">
        {text("contactName", "Contact name")}
        {text("contactPhone", "Contact phone", undefined, "tel")}
      </div>
      {area("notes", "Property notes", "Anything about the yard that is always true")}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="outline" className="min-h-11" disabled={pending}>
          Save
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p role="alert" className={`${FORM_STATUS} text-destructive`}>
        {error}
      </p>
    </form>
  )
}

/** The block itself: the lines (or "Nothing on file yet"), and Edit for a manager. */
export function PropertyBlock({ propertyId, yard, readOnly = false, actions }: { propertyId: string; yard: Yard; readOnly?: boolean; actions?: VisitActions }) {
  const [editing, setEditing] = useState(false)
  const lines = propertyLines(yard, { canSeeContact: !readOnly })
  return (
    <section aria-labelledby="customer-property" data-slot="customer-property">
      <SectionHeading
        id="customer-property"
        action={
          !readOnly && !editing ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : undefined
        }
      >
        Property
      </SectionHeading>
      {editing ? (
        <PropertyFields propertyId={propertyId} yard={yard} actions={actions} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      ) : lines.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nothing on file yet</p>
      )}
    </section>
  )
}
