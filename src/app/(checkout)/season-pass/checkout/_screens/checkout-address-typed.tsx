"use client"

import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SERVICE_TOWNS, isTypedPlace, typedPlace, type PlaceSuggestion } from "@/lib/places"

// The typed fallback under the address box: street, city and an optional zip. It works with no lookup
// at all, so a customer the search cannot find, or a site with no Places key,
// still buys. Filled in, it hands the step the same `PlaceSuggestion` a pick
// would (`typedPlace`), so serviceability, `passes.create` and the admin's
// property never know the difference. The city is typed, so a typed address
// can be outside the six cities: the step then says so under the box.

export interface TypedAddressProps {
  /** the step's picked place; read back when it is a typed one, so going back and forth keeps the fields */
  place: PlaceSuggestion | null
  /** the street to start from: what was in the search box when the fields opened */
  initialLine1: string
  attempted: boolean
  /** the city is asked for at once: the pick the street came from had no city we could read */
  cityAsked?: boolean
  /** take focus when the fields open; off when the step itself opens on them (the shell focuses `[data-autofocus]` then) */
  focusOnOpen?: boolean
  onType: (text: string) => void
  onPick: (place: PlaceSuggestion) => void
}

const FIELD = "h-14 rounded-lg bg-background px-4 text-lg shadow-sm"
const MIN_STREET = 3
export const STREET_PROBLEM = "We need your street address, with the house number."
export const CITY_PROBLEM = "Add your city."
export const ZIP_PROBLEM = "A ZIP code is five digits. Leave it blank if you are not sure."

const zipOk = (zip: string) => zip === "" || /^\d{5}$/.test(zip)
const streetOk = (line1: string) => line1.trim().length >= MIN_STREET

export function TypedAddress({ place, initialLine1, attempted, cityAsked, focusOnOpen, onType, onPick }: TypedAddressProps) {
  const id = useId()
  const typed = place && isTypedPlace(place.id) ? place : null
  const [line1, setLine1] = useState(typed?.line1 ?? initialLine1)
  const [city, setCity] = useState(typed?.town ?? "")
  const [zip, setZip] = useState(typed?.zip ?? "")
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const street = useRef<HTMLInputElement>(null)
  const cityBox = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusOnOpen) (cityAsked ? cityBox : street).current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOnOpen])

  // Every change answers the step at once: the whole address when the three fields hold one, else just the text (which clears any pick).
  // The whole address answers the step once the city is settled: one of the six as soon as it is typed, any other city once the customer leaves the box, so "E" on its way to "Erie" is never turned away.
  const settle = (next: { line1: string; city: string; zip: string }, left: boolean) => {
    const known = SERVICE_TOWNS.some((t) => t.toLowerCase() === next.city.trim().toLowerCase())
    if (streetOk(next.line1) && next.city.trim() && zipOk(next.zip) && (known || left || touched.has("city"))) onPick(typedPlace(next.line1, next.city, next.zip))
    else onType(next.line1)
  }
  const update = (next: { line1: string; city: string; zip: string }) => {
    setLine1(next.line1)
    setCity(next.city)
    setZip(next.zip)
    settle(next, false)
  }
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field))
  const show = (field: string) => attempted || touched.has(field) || (field === "city" && !!cityAsked)

  const problems = {
    line1: show("line1") && !streetOk(line1) ? STREET_PROBLEM : null,
    city: show("city") && !city.trim() ? CITY_PROBLEM : null,
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
          onChange={(event) => update({ line1: event.target.value, city, zip })}
          onBlur={() => touch("line1")}
          aria-invalid={!!problems.line1}
          aria-describedby={problems.line1 ? `${id}-line1-note` : undefined}
          className={cn(FIELD, problems.line1 && "border-destructive")}
        />
        {note("line1")}
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-city`} className="text-sm text-muted-foreground">
            City
          </Label>
          <Input
            ref={cityBox}
            id={`${id}-city`}
            name="city"
            autoComplete="address-level2"
            placeholder="Erie"
            value={city}
            onChange={(event) => update({ line1, city: event.target.value, zip })}
            onBlur={() => (touch("city"), settle({ line1, city, zip }, true))}
            aria-invalid={!!problems.city}
            aria-describedby={problems.city ? `${id}-city-note` : undefined}
            className={cn(FIELD, problems.city && "border-destructive")}
          />
          {note("city")}
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
            onChange={(event) => update({ line1, city, zip: event.target.value.replace(/\D/g, "").slice(0, 5) })}
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
