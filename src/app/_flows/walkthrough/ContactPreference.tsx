"use client"

import { cn } from "@/lib/utils"

// How we reach the customer, asked once (docs/plans/2026-11-19-customer-side-design.md): text, email or both. Booking asks it under the contact
// fields; Details shows the same choice, so every message the customer gets names this channel. Native radios, so arrow keys work. Pure props.

export type ContactChannel = "text" | "email" | "both"
const CHOICES: { value: ContactChannel; label: string; line: string }[] = [
  { value: "text", label: "Text", line: "Day and time, the day-before reminder and your receipt, by text" },
  { value: "email", label: "Email", line: "The same messages, by email" },
  { value: "both", label: "Text and email", line: "Every message both ways" },
]

export const channelWords = (c: ContactChannel) => (c === "text" ? "text" : c === "email" ? "email" : "text and email")

export function ContactPreference({ value, onChange, name = "contact-preference" }: { value: ContactChannel; onChange: (v: ContactChannel) => void; name?: string }) {
  return (
    <fieldset data-slot="contact-preference" className="mt-8 flex flex-col gap-2">
      <legend className="mb-1 text-base font-medium text-foreground">How should we reach you?</legend>
      {CHOICES.map((c) => (
        <label key={c.value} className={cn("flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-input bg-background px-3 py-2 text-base has-[:checked]:border-primary has-[:checked]:bg-primary/10")}>
          <input type="radio" name={name} value={c.value} checked={value === c.value} onChange={() => onChange(c.value)} className="mt-1 size-4 shrink-0 accent-primary" />
          <span className="flex flex-col">
            <span className="font-medium text-foreground">{c.label}</span>
            <span className="text-sm text-navy-light">{c.line}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
