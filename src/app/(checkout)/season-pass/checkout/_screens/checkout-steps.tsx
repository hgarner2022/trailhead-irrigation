"use client"

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PassCard } from "@/components/blocks/PassCard"
import { WeekCard } from "@/components/blocks/WeekCard"
import type { BlowoutWeek, Pass, Town } from "@/lib/admin/types"
import { writtenDate } from "@/lib/admin/format"
import { formatMoney, spotsLeft } from "@/lib/admin/metrics"
import { MAX_ZONES, MIN_ZONES, SEASON_PASS_VISITS, seasonPassPrice, visitPrice } from "@/lib/season-pass"
import { TOWNS, contactProblem, type CheckoutFields } from "./checkout-state"

// The body of each checkout step: the one input under the question, and the
// helper line under that. The shell (CheckoutFlow) owns the question, the
// progress line, the buttons and the keys; these only read and set fields.
// `data-autofocus` marks the element the shell focuses when the step opens.

export interface StepProps {
  state: CheckoutFields
  set: <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => void
}

/** A tall input in the body size, so the one field on screen reads as the thing to do. */
const FIELD = "h-14 rounded-lg bg-background px-4 text-lg shadow-sm"
const VISIT_SHORT = ["Turn-on", "Inspection", "Blowout"]
const ZONE_OPTIONS = Array.from({ length: MAX_ZONES - MIN_ZONES + 1 }, (_, i) => MIN_ZONES + i)

/** Fades and rises the element once when it mounts; still under reduced motion and in jsdom. */
export function useReveal<T extends HTMLElement>(duration: number) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== "function") return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const animation = el.animate(
      [
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "both" },
    )
    return () => animation.cancel()
  }, [duration])
  return ref
}

export function Helper({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-base text-muted-foreground">{children}</p>
}

export function AddressStep({ state, set }: StepProps) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        <Input
          data-autofocus
          aria-label="Street address"
          autoComplete="street-address"
          placeholder="123 Trailhead Way"
          value={state.address}
          onChange={(event) => set("address", event.target.value)}
          className={FIELD}
        />
        <Select value={state.town ?? ""} onValueChange={(value) => set("town", value as Town)}>
          <SelectTrigger aria-label="Town" className={cn(FIELD, "w-full data-[size=default]:h-14")}>
            <SelectValue placeholder="Town" />
          </SelectTrigger>
          <SelectContent>
            {TOWNS.map((town) => (
              <SelectItem key={town} value={town}>
                {town}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Helper>We serve Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield.</Helper>
    </>
  )
}

export function ZonesStep({ state, set }: StepProps) {
  return (
    <>
      <div role="group" aria-label="Zones" className="flex flex-wrap gap-2">
        {ZONE_OPTIONS.map((zones) => {
          const pressed = state.zones === zones
          const upTo = zones === MIN_ZONES
          return (
            <button
              key={zones}
              type="button"
              aria-pressed={pressed}
              aria-label={`${upTo ? "Up to " : ""}${zones} zones`}
              data-autofocus={pressed || undefined}
              onClick={() => set("zones", zones)}
              className={cn(
                "size-12 cursor-pointer rounded-lg border font-display text-xl tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                pressed ? "border-navy bg-navy text-white" : "border-border bg-background text-navy hover:border-navy/40",
              )}
            >
              {zones}
            </button>
          )
        })}
      </div>
      <p data-slot="checkout-price" className="mt-10 font-display text-5xl leading-none text-navy tabular-nums">
        {formatMoney(seasonPassPrice(state.zones))}
      </p>
      <p className="mt-2 text-base text-muted-foreground">per season, billed after each visit</p>
      <p className="mt-1 text-sm text-muted-foreground tabular-nums">
        {SEASON_PASS_VISITS.map((visit, i) => `${VISIT_SHORT[i]} ${formatMoney(visitPrice(visit, state.zones))}`).join(" · ")}
      </p>
      <Helper>Six zones or fewer is the starting price. Not sure? Count the stations on your controller, or we confirm it on the first visit.</Helper>
    </>
  )
}

export function WeekStep({ state, set, weeks }: StepProps & { weeks: BlowoutWeek[] }) {
  const row = useRef<HTMLDivElement>(null)
  // On a phone the row scrolls; the chosen week slides to the middle.
  useEffect(() => {
    const el = row.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    el.querySelector<HTMLElement>('[data-slot="week-card"][data-selected="true"]')?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [state.weekStart])
  return (
    <>
      <div ref={row} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {weeks.map((week) =>
          spotsLeft(week) === 0 ? (
            <div
              key={week.weekStart}
              role="group"
              aria-disabled="true"
              aria-label={`Week of ${writtenDate(week.weekStart)}, full`}
              data-slot="week-option"
              data-full
              className="min-w-60 shrink-0 snap-center opacity-60 sm:min-w-0"
            >
              <WeekCard week={week} />
              <p className="mt-2 text-sm text-muted-foreground">That week is full</p>
            </div>
          ) : (
            <div key={week.weekStart} data-slot="week-option" className="min-w-60 shrink-0 snap-center sm:min-w-0">
              <WeekCard week={week} selected={state.weekStart === week.weekStart} onSelect={() => set("weekStart", week.weekStart)} />
            </div>
          ),
        )}
      </div>
      <Helper>Your week is reserved now. Ryan sets the day in September.</Helper>
    </>
  )
}

const CONTACT = [
  { key: "firstName", label: "First name", type: "text", autoComplete: "given-name", inputMode: undefined },
  { key: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email" },
  { key: "phone", label: "Phone", type: "tel", autoComplete: "tel", inputMode: "tel" },
] as const

export function ContactStep({ state, set, attempted }: StepProps & { attempted: boolean }) {
  const id = useId()
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  return (
    <div className="grid gap-5">
      {CONTACT.map((field, i) => {
        const problem = contactProblem(field.key, state[field.key])
        const shown = problem !== null && (attempted || touched.has(field.key))
        const inputId = `${id}-${field.key}`
        return (
          <div key={field.key} className="grid gap-2">
            <Label htmlFor={inputId} className="text-sm text-muted-foreground">
              {field.label}
            </Label>
            <Input
              id={inputId}
              data-autofocus={i === 0 || undefined}
              type={field.type}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              value={state[field.key]}
              onChange={(event) => set(field.key, event.target.value)}
              onBlur={() => setTouched((prev) => new Set(prev).add(field.key))}
              aria-invalid={shown}
              aria-describedby={shown ? `${inputId}-note` : undefined}
              className={cn(FIELD, shown && "border-destructive")}
            />
            {shown && (
              <p id={`${inputId}-note`} className="text-sm text-destructive">
                {problem}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function CardStep() {
  return (
    <>
      <div className="rounded-lg border border-dashed border-border bg-stone p-8 text-center text-muted-foreground">
        Stripe&apos;s card form mounts here. Nothing is charged today.
      </div>
      <Helper>We charge the card after each visit, at the price you just saw.</Helper>
    </>
  )
}

export function DoneStep({ pass, email, onSaveImage, onDone }: { pass: Pass; email: string; onSaveImage?: () => void; onDone?: () => void }) {
  const ref = useReveal<HTMLDivElement>(600)
  return (
    <div ref={ref}>
      <PassCard pass={pass} art="flat" priority />
      <p className="mt-8 text-lg text-foreground">
        {`Turn-on in April to May, inspection in July, blowout the week of ${writtenDate(pass.blowoutWeek)}. We'll email the details to ${email}.`}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={onSaveImage}>
          Save as image
        </Button>
        <Button size="lg" variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
