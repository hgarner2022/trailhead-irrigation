"use client"

import { InfoTip } from "@/components/blocks/InfoTip"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { cn } from "@/lib/utils"

// How we reach the customer, asked once with the contact details and read everywhere after (Hannah's rule, Nov 19 2026): text, email or both. The booking form asks it under the contact
// fields and Details in the account shows the same choice, so every message the customer gets names this channel. A three-way SegmentedControl; what the choice means is said once, in a tooltip
// beside the question (Hannah, Nov 23 2026: nothing printed under the control). Controlled; pure props, client component.

export type ContactChannel = "text" | "email" | "both"

const CHOICES: { value: ContactChannel; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "both", label: "Text and email" },
]

/** What the choice means, once: the messages it is for. */
export const CONTACT_TIP = "The day and time, the day-before reminder and your receipt are sent this way."

export const channelWords = (c: ContactChannel) => (c === "text" ? "text" : c === "email" ? "email" : "text and email")

export function ContactPreference({ value, onChange, name = "contact-preference", className }: { value: ContactChannel; onChange: (v: ContactChannel) => void; name?: string; className?: string }) {
  return (
    <div data-slot="contact-preference" data-name={name} className={cn("space-y-2", className)}>
      <p id={`${name}-label`} className="flex items-center gap-1 text-sm font-medium text-foreground">
        How should we reach you?
        <InfoTip label="About how we reach you">{CONTACT_TIP}</InfoTip>
      </p>
      <SegmentedControl label="How should we reach you?" options={CHOICES.map(({ value: v, label }) => ({ value: v, label }))} value={value} onChange={(v) => onChange(v as ContactChannel)} className="flex w-full [&>button]:flex-1 [&>button]:px-2 [&>button]:whitespace-nowrap" />
    </div>
  )
}
