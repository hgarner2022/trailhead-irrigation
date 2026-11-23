"use client"

import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isTypedPlace, typedPlace, zipCityMismatch, type PlaceSuggestion } from "@/lib/places"

// The typed fallback, shown only after a search found nothing ("We can't find it. Enter it here."): street, city and a required ZIP. The ZIP decides whether we serve the yard and the city is
// checked against it (a mismatch is a quiet line under the city, Hannah, Nov 22 2026). It works with no lookup
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
  /** told whenever a field changes, so a screen can name what is missing in its summary */
  onValues?: (values: TypedValues) => void
}

const FIELD = "h-14 rounded-lg bg-background px-4 text-lg shadow-sm"
const MIN_STREET = 3
export const STREET_PROBLEM = "We need your street address, with the house number."
export const CITY_PROBLEM = "Add your city."
export const ZIP_PROBLEM = "A ZIP code is five digits."
export const ZIP_MISSING = "Add your ZIP code."
export const CANT_FIND = "We can't find it. Enter it here."

const zipOk = (zip: string) => /^\d{5}$/.test(zip)
const streetOk = (line1: string) => line1.trim().length >= MIN_STREET

export interface TypedValues {
  line1: string
  city: string
  zip: string
}

/** What is missing from the three fields, in the words beside each field and the selector of the field, in the order they appear. */
export function typedProblems(v: TypedValues): { message: string; field: string }[] {
  const mismatch = v.city.trim() && zipOk(v.zip) ? zipCityMismatch(typedPlace(v.line1, v.city, v.zip)) : null
  return [
    ...(streetOk(v.line1) ? [] : [{ message: STREET_PROBLEM, field: "[name=address]" }]),
    ...(v.city.trim() ? (mismatch ? [{ message: mismatch, field: "[name=city]" }] : []) : [{ message: CITY_PROBLEM, field: "[name=city]" }]),
    ...(zipOk(v.zip) ? [] : [{ message: v.zip === "" ? ZIP_MISSING : ZIP_PROBLEM, field: "[name=zip]" }]),
  ]
}

export function TypedAddress({ place, initialLine1, attempted, cityAsked, focusOnOpen, onType, onPick, onValues }: TypedAddressProps) {
  const id = useId()
  const typed = place && isTypedPlace(place.id) ? place : null
  const [line1, setLine1] = useState(typed?.line1 ?? initialLine1)
  const [city, setCity] = useState(typed?.town ?? "")
  const [zip, setZip] = useState(typed?.zip ?? "")
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const street = useRef<HTMLInputElement>(null)
  const cityBox = useRef<HTMLInputElement>(null)

  useEffect(() => {
    onValues?.({ line1, city, zip })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (focusOnOpen) (cityAsked ? cityBox : street).current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOnOpen])

  // Every change answers the step at once: the whole address when the three fields hold one, else just the text (which clears any pick).
  // The whole address answers the step once street, city and a five digit ZIP are all there; the ZIP then decides whether we serve it.
  const settle = (next: { line1: string; city: string; zip: string }) => {
    if (streetOk(next.line1) && next.city.trim() && zipOk(next.zip)) onPick(typedPlace(next.line1, next.city, next.zip))
    else onType(next.line1)
  }
  const update = (next: { line1: string; city: string; zip: string }) => {
    setLine1(next.line1)
    setCity(next.city)
    setZip(next.zip)
    onValues?.(next)
    settle(next)
  }
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field))
  const show = (field: string) => attempted || touched.has(field) || (field === "city" && !!cityAsked)

  const mismatch = city.trim() && zipOk(zip) ? zipCityMismatch(typedPlace(line1, city, zip)) : null
  const problems = {
    line1: show("line1") && !streetOk(line1) ? STREET_PROBLEM : null,
    city: show("city") && !city.trim() ? CITY_PROBLEM : show("city") && mismatch ? mismatch : null,
    zip: show("zip") && !zipOk(zip) ? (zip === "" ? ZIP_MISSING : ZIP_PROBLEM) : null,
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
            onBlur={() => touch("city")}
            aria-invalid={!!problems.city}
            aria-describedby={problems.city ? `${id}-city-note` : undefined}
            className={cn(FIELD, problems.city && "border-destructive")}
          />
          {note("city")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-zip`} className="text-sm text-muted-foreground">
            ZIP
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
