"use client"

import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { cn } from "@/lib/utils"

// How we reach the customer, asked once with the contact details and read everywhere after (Hannah's rule, Nov 19 2026): text, email or both. The booking form asks it under the contact
// fields and Details in the account shows the same choice, so every message the customer gets names this channel. A three-way SegmentedControl with one line under it that says what the
// chosen channel means, so the choice takes one row on a phone. Controlled; pure props, client component.

export type ContactChannel = "text" | "email" | "both"

const CHOICES: { value: ContactChannel; label: string; line: string }[] = [
  { value: "text", label: "Text", line: "The day and time, the day-before reminder and your receipt, by text." },
  { value: "email", label: "Email", line: "The same messages, by email." },
  { value: "both", label: "Text and email", line: "Every message both ways." },
]

export const channelWords = (c: ContactChannel) => (c === "text" ? "text" : c === "email" ? "email" : "text and email")

export function ContactPreference({ value, onChange, name = "contact-preference", plain, className }: { value: ContactChannel; onChange: (v: ContactChannel) => void; name?: string; /** the booking form: the three choices and nothing under them */ plain?: boolean; className?: string }) {
  const chosen = CHOICES.find((c) => c.value === value) ?? CHOICES[0]!
  return (
    <div data-slot="contact-preference" data-name={name} className={cn("space-y-2", className)}>
      <p id={`${name}-label`} className="text-sm font-medium text-foreground">
        How should we reach you?
      </p>
      <SegmentedControl label="How should we reach you?" options={CHOICES.map(({ value: v, label }) => ({ value: v, label }))} value={value} onChange={(v) => onChange(v as ContactChannel)} className="flex w-full [&>button]:flex-1 [&>button]:px-2 [&>button]:whitespace-nowrap" />
      {!plain && <p className="text-sm text-muted-foreground">{chosen.line}</p>}
    </div>
  )
}
