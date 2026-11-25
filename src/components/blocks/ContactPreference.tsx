"use client"

import { InfoTip } from "@/components/blocks/InfoTip"
import { cn } from "@/lib/utils"
import { optionClass } from "./option-styles"

// How we reach the customer, asked once with the contact details and read everywhere after (Hannah's rule, Nov 19 2026): text, email or both. The booking form asks it under the contact
// fields and Details in the account shows the same choice, so every message the customer gets names this channel. Three option chips, the same chips as every other choice the customer makes (optionClass); what the choice means is said once, in a tooltip
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
      <div role="radiogroup" aria-label="How should we reach you?" className="grid grid-cols-3 gap-2">
        {CHOICES.map((c, i) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={value === c.value}
            tabIndex={value === c.value ? 0 : -1}
            onClick={() => onChange(c.value)}
            onKeyDown={(e) => {
              // the arrows move the choice, as in any radio group
              const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
              if (!step) return
              e.preventDefault()
              const next = CHOICES[(i + step + CHOICES.length) % CHOICES.length]!
              onChange(next.value)
              ;(e.currentTarget.parentElement?.children[CHOICES.indexOf(next)] as HTMLElement | undefined)?.focus()
            }}
            className={cn(optionClass({ selected: value === c.value }), "flex min-h-11 items-center justify-center px-2 text-center text-sm font-medium whitespace-nowrap")}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
