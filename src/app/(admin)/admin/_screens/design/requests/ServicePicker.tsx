"use client"

import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { SERVICE_CHOICES, SOMETHING_ELSE, type ServicePick } from "./request-catalogue"

// "What is this for?" (docs/plans/2026-11-21-request-conversion-research.md): the one picker Ryan meets when a request becomes a job and again in Change service on the job. Its choices are
// the booking catalogue's services and, last, "Something else", which asks for the name of the job. Controlled; pure props. What is missing is said by the dialog that holds it.

const SELECT = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"

export function ServicePicker({ value, onChange }: { value: ServicePick; onChange: (pick: ServicePick) => void }) {
  return (
    <>
      <FormRow label="What is this for?">
        <select value={value.key} onChange={(e) => onChange({ key: e.target.value, other: e.target.value === SOMETHING_ELSE.key ? value.other : "" })} className={SELECT}>
          <option value="">Choose one</option>
          {SERVICE_CHOICES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
          <option value={SOMETHING_ELSE.key}>{SOMETHING_ELSE.name}</option>
        </select>
      </FormRow>
      {value.key === SOMETHING_ELSE.key && (
        <FormRow label="Name of the job">
          <Input value={value.other} onChange={(e) => onChange({ key: value.key, other: e.target.value })} autoComplete="off" />
        </FormRow>
      )}
    </>
  )
}
