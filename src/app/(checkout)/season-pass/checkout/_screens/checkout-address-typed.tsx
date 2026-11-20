"use client"

import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Town } from "@/lib/admin/types"
import { SERVICE_TOWNS, isTypedPlace, typedPlace, type PlaceSuggestion } from "@/lib/places"

// The typed fallback under the address box: street, town (one of the six)
// and an optional zip. It works with no lookup at all, so a customer the
// search cannot find, or a site with no Places key, still buys. Filled in,
// it hands the step the same `PlaceSuggestion` a pick would (`typedPlace`),
// so serviceability, `passes.create` and the admin's property never know the
// difference. Only the six towns are offered, so a typed address is never
// out of area.

export interface TypedAddressProps {
  /** the step's picked place; read back when it is a typed one, so going back and forth keeps the fields */
  place: PlaceSuggestion | null
  /** the street to start from: what was in the search box when the fields opened */
  initialLine1: string
  attempted: boolean
  /** the town is asked for at once: the pick the street came from had no town we could read */
  townAsked?: boolean
  /** take focus when the fields open; off when the step itself opens on them (the shell focuses `[data-autofocus]` then) */
  focusOnOpen?: boolean
  onType: (text: string) => void
  onPick: (place: PlaceSuggestion) => void
}

const FIELD = "h-14 rounded-lg bg-background px-4 text-lg shadow-sm"
const SELECT = "h-14 w-full rounded-lg border border-border bg-background px-4 text-lg text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
const MIN_STREET = 3
export const STREET_PROBLEM = "We need your street address, with the house number."
export const TOWN_PROBLEM = "Pick your town so we know which route you are on."
export const ZIP_PROBLEM = "A ZIP code is five digits. Leave it blank if you are not sure."

const zipOk = (zip: string) => zip === "" || /^\d{5}$/.test(zip)
const streetOk = (line1: string) => line1.trim().length >= MIN_STREET

export function TypedAddress({ place, initialLine1, attempted, townAsked, focusOnOpen, onType, onPick }: TypedAddressProps) {
  const id = useId()
  const typed = place && isTypedPlace(place.id) ? place : null
  const [line1, setLine1] = useState(typed?.line1 ?? initialLine1)
  const [town, setTown] = useState<Town | "">(typed ? (typed.town as Town) : "")
  const [zip, setZip] = useState(typed?.zip ?? "")
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const street = useRef<HTMLInputElement>(null)
  const townBox = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (focusOnOpen) (townAsked ? townBox : street).current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOnOpen])

  // Every change answers the step at once: the whole address when the three fields hold one, else just the text (which clears any pick).
  const update = (next: { line1: string; town: Town | ""; zip: string }) => {
    setLine1(next.line1)
    setTown(next.town)
    setZip(next.zip)
    if (streetOk(next.line1) && next.town && zipOk(next.zip)) onPick(typedPlace(next.line1, next.town, next.zip))
    else onType(next.line1)
  }
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field))
  const show = (field: string) => attempted || touched.has(field) || (field === "town" && !!townAsked)

  const problems = {
    line1: show("line1") && !streetOk(line1) ? STREET_PROBLEM : null,
    town: show("town") && !town ? TOWN_PROBLEM : null,
    zip: show("zip") && !zipOk(zip) ? ZIP_PROBLEM : null,
  }
  const note = (field: keyof typeof problems) =>
    problems[field] && (
      <p id={`${id}-${field}-note`} className="text-sm text-destructive">
        {problems[field]}
      </p>
    )

  return (
    <div data-slot="typed-address" className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-line1`} className="text-sm text-muted-foreground">
          Street address
        </Label>
        <Input
          ref={street}
          id={`${id}-line1`}
          name="address"
          data-autofocus
          autoComplete="street-address"
          placeholder="480 Briggs St"
          value={line1}
          onChange={(event) => update({ line1: event.target.value, town, zip })}
          onBlur={() => touch("line1")}
          aria-invalid={!!problems.line1}
          aria-describedby={problems.line1 ? `${id}-line1-note` : undefined}
          className={cn(FIELD, problems.line1 && "border-destructive")}
        />
        {note("line1")}
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-town`} className="text-sm text-muted-foreground">
            Town
          </Label>
          <select
            ref={townBox}
            id={`${id}-town`}
            name="town"
            autoComplete="address-level2"
            value={town}
            onChange={(event) => update({ line1, town: event.target.value as Town | "", zip })}
            onBlur={() => touch("town")}
            aria-invalid={!!problems.town}
            aria-describedby={problems.town ? `${id}-town-note` : undefined}
            className={cn(SELECT, problems.town && "border-destructive")}
          >
            <option value="">Pick your town</option>
            {SERVICE_TOWNS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {note("town")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-zip`} className="text-sm text-muted-foreground">
            ZIP (optional)
          </Label>
          <Input
            id={`${id}-zip`}
            name="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="80516"
            value={zip}
            onChange={(event) => update({ line1, town, zip: event.target.value.replace(/\D/g, "").slice(0, 5) })}
            onBlur={() => touch("zip")}
            aria-invalid={!!problems.zip}
            aria-describedby={problems.zip ? `${id}-zip-note` : undefined}
            className={cn(FIELD, "tabular-nums", problems.zip && "border-destructive")}
          />
          {note("zip")}
        </div>
      </div>
    </div>
  )
}
