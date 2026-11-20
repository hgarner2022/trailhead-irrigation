"use client"

import { CheckCircle2, MapPinOff } from "lucide-react"
import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { ZIP_HELP, ZIP_WAY_OUT, cleanZip, zipCheck, zipOutside, zipServed } from "@/lib/booking/zip"
import { cn } from "@/lib/utils"

// The booking form's first question, in Jobber's order: "Enter your zip code to get started". Five digits, a number keypad on a phone, and the answer under the box as soon as the fifth
// digit is typed: a town we serve gets one green line, a zip we do not serve gets the six towns, the phone number and the way out, and Continue stays off. A half-typed zip says
// nothing until the customer presses Continue, then says what to add. Controlled; the screen holds the text. Pure props, client component.

export interface ZipCheckProps {
  value: string
  onChange: (text: string) => void
  /** Continue was pressed while the zip could not pass: say what to add */
  attempted?: boolean
  className?: string
}

export function ZipCheck({ value, onChange, attempted, className }: ZipCheckProps) {
  const result = zipCheck(value)
  const help = (result.state === "idle" || result.state === "partial") && attempted ? ZIP_HELP : undefined
  return (
    <div data-slot="zip-check" data-state={result.state} className={cn("space-y-4", className)}>
      <FormRow label="Zip code" hint={result.state === "idle" || result.state === "partial" ? "We'll check that we come to you." : undefined} error={help}>
        <Input
          name="zip"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          data-autofocus
          value={value}
          onChange={(e) => onChange(cleanZip(e.target.value))}
          aria-invalid={Boolean(help) || result.state === "outside" || undefined}
          className={cn("h-14 max-w-48 rounded-lg px-4 text-2xl tabular-nums shadow-sm", (help || result.state === "outside") && "border-destructive")}
        />
      </FormRow>
      {result.state === "ok" && (
        <p role="status" data-slot="zip-served" className="flex items-center gap-2 text-base text-foreground">
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-success" />
          {zipServed(result.town)}
        </p>
      )}
      {result.state === "outside" && (
        <div role="status" data-slot="zip-outside" className="flex gap-3 rounded-lg border border-border bg-stone p-4">
          <MapPinOff aria-hidden className="mt-0.5 size-5 shrink-0 text-navy" />
          <div className="space-y-2 text-base text-foreground">
            <p>{zipOutside(result.zip)}</p>
            <p>
              {`${ZIP_WAY_OUT} `}
              <a href={PHONE_TEL} className="inline-flex min-h-11 items-center font-semibold text-primary-deep underline underline-offset-2">
                {`Call ${PHONE_DISPLAY}`}
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
