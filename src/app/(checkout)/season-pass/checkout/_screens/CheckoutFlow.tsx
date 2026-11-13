"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Pass } from "@/lib/admin/types"
import { STEPS, STEP_COUNT, canContinue, toPass, useCheckoutState, type CheckoutFields } from "./checkout-state"
import type { PlaceProvider } from "@/lib/places"
import { AddressStep } from "./checkout-address"
import { CONSENT_PROBLEM_ID, CardStep, ContactStep, DoneStep, ZonesStep, useReveal } from "./checkout-steps"
import { TimingStep } from "./checkout-timing"

// The Season Pass checkout as six full-screen questions, one input each (the
// timing step asks its two together), the way Typeform paces a form: a thin orange line across the top for progress,
// the question in the display face, the trail photo faint behind the cream
// canvas, Enter to continue and the arrow keys to move. Only the current step
// is rendered, so there is no page to scroll between questions. State is the
// reducer in checkout-state.ts; nothing here fetches or charges. The card
// step is a placeholder until Stripe is wired; the consent boxes under it are
// real and gate the button. Client component.

export interface CheckoutFlowProps {
  season: number
  /** carried in from the Season Pass calculator */
  initialZones?: number
  /** open on this step; stories use it with `prefill` */
  initialStep?: number
  prefill?: Partial<CheckoutFields>
  /** finds addresses as the customer types; the fixture until Google Places is wired */
  places?: PlaceProvider
  /** called once, when the card step is passed; Done is terminal, so the card step is never passed twice */
  onComplete?: (pass: Pass) => void
  onSaveImage?: (pass: Pass) => void
  onDone?: () => void
}

const BACKDROP = "/images/trail-mountain-meadow.jpg"
const LOGO = "/images/logo-badge.png"
const COLUMN = "mx-auto w-full max-w-2xl container-padding-x"
/** The reserved moment gets the long rise; a step change gets a short one; the first question opens still. */
const REVEAL_MS = { step: 300, done: 600 }

const TIMING_CHOICE = '[data-slot="timing-choice"]'

/** On the timing step the arrow keys walk the two groups before they move between steps: the pressed choice of the other group takes focus. */
function timingNeighbour(target: HTMLElement, direction: "down" | "up"): HTMLElement | null {
  const kind = target.closest<HTMLElement>(TIMING_CHOICE)?.dataset.kind
  if (kind !== (direction === "down" ? "turn-on" : "blowout")) return null
  const other = direction === "down" ? "blowout" : "turn-on"
  return target.closest("section")?.querySelector<HTMLElement>(`${TIMING_CHOICE}[data-kind="${other}"][aria-pressed="true"]`) ?? null
}

/** Elements that use Enter and the arrow keys themselves; a combobox only while its list is open. */
function ownsKeys(target: HTMLElement): boolean {
  const role = target.getAttribute("role")
  if (role === "combobox") return target.getAttribute("aria-expanded") === "true"
  return target.tagName === "SELECT" || target.tagName === "TEXTAREA" || role === "listbox" || role === "option" || !!target.closest('[data-slot="select-content"]')
}

function StepBody({ duration, enabled, children }: { duration: number; enabled: boolean; children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>(duration, enabled)
  return <div ref={ref}>{children}</div>
}

export function CheckoutFlow({ season, initialZones, initialStep, prefill, places, onComplete, onSaveImage, onDone }: CheckoutFlowProps) {
  const [state, dispatch] = useCheckoutState({ ...(initialZones ? { zones: initialZones } : {}), ...prefill, ...(initialStep ? { step: initialStep } : {}) })
  // The step on which Enter was pressed too early, so the address and contact steps show what is missing.
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null)
  const section = useRef<HTMLElement>(null)
  const questionId = useId()
  // Set on the first move, so opening the page does not animate; Done always rises.
  const [moved, setMoved] = useState(false)
  const { step } = state
  const current = STEPS[step - 1]
  const done = current.key === "done"
  const valid = canContinue(state)
  const attempted = attemptedStep === step

  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const next = () => {
    if (!valid) {
      setAttemptedStep(step)
      return
    }
    if (current.key === "card") onComplete?.(toPass({ ...state, cardSaved: true }, season))
    dispatch({ type: "next" })
    setMoved(true)
  }
  const back = () => {
    dispatch({ type: "back" })
    setMoved(true)
  }

  // Each step opens with its input focused, or the section itself where there is none to type in.
  useEffect(() => {
    const el = section.current
    const target = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el
    target?.focus({ preventScroll: true })
  }, [step])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (done || event.nativeEvent.isComposing || ownsKeys(target) || event.altKey || event.metaKey || event.ctrlKey) return
    const nav = target.closest("[data-nav]")
    const typing = target.tagName === "INPUT"
    if (event.key === "Enter") {
      // A button answers Enter itself; a pressed pill or timing choice already holds its answer, so Enter moves on.
      if (nav || (target.tagName === "BUTTON" && target.getAttribute("aria-pressed") !== "true")) return
      event.preventDefault()
      next()
    } else if (event.key === "ArrowDown" && !typing) {
      event.preventDefault()
      const neighbour = timingNeighbour(target, "down")
      if (neighbour) neighbour.focus()
      else if (valid) next()
    } else if (event.key === "ArrowUp" && !typing) {
      event.preventDefault()
      const neighbour = timingNeighbour(target, "up")
      if (neighbour) neighbour.focus()
      else if (step > 1) back()
    }
  }

  let body: React.ReactNode
  switch (current.key) {
    case "address":
      body = (
        <AddressStep
          state={state}
          attempted={attempted}
          places={places}
          onType={(text) => dispatch({ type: "typeAddress", text })}
          onPick={(place) => dispatch({ type: "pickPlace", place })}
        />
      )
      break
    case "zones":
      body = <ZonesStep state={state} set={set} />
      break
    case "timing":
      body = <TimingStep state={state} set={set} questionId={questionId} />
      break
    case "contact":
      body = <ContactStep state={state} set={set} attempted={attempted} />
      break
    case "card":
      body = <CardStep state={state} set={set} attempted={attempted} />
      break
    default: {
      const pass = toPass(state, season)
      body = <DoneStep pass={pass} email={state.email} onSaveImage={() => onSaveImage?.(pass)} onDone={onDone} />
    }
  }

  return (
    <div data-slot="checkout-flow" data-step={current.key} className="relative isolate min-h-svh bg-cream text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image src={BACKDROP} alt="" fill sizes="100vw" quality={40} className="object-cover opacity-[0.07]" />
      </div>

      <div
        role="progressbar"
        aria-label="Checkout progress"
        aria-valuemin={1}
        aria-valuemax={STEP_COUNT}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of ${STEP_COUNT}`}
        className="fixed inset-x-0 top-0 z-20 h-1 bg-border/60"
      >
        <div data-slot="checkout-progress" className="h-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${(step / STEP_COUNT) * 100}%` }} />
      </div>
      <header className="fixed inset-x-0 top-1 z-10 flex items-center justify-between container-padding-x py-3">
        <Image src={LOGO} alt="Trailhead Lawn & Irrigation" width={51} height={36} priority className="h-9 w-auto" />
        {/* A small "2 of 6", not a numbered stepper (the PRD's rule); hidden from
            readers because the progress bar's valuetext already says it. A point
            for Hannah: keep it, or let the orange line stand alone. */}
        <span data-slot="checkout-counter" aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">{`${step} of ${STEP_COUNT}`}</span>
      </header>
      {/* The one announcement per step. The section is not named, so focusing it stays quiet. */}
      <p aria-live="polite" className="sr-only">{`Step ${step} of ${STEP_COUNT}, ${current.question}`}</p>

      <section key={step} ref={section} tabIndex={-1} onKeyDown={onKeyDown} className="flex min-h-svh flex-col outline-none">
        <div className={cn(COLUMN, "flex flex-1 flex-col justify-center pt-20 pb-8", current.key === "timing" && "lg:max-w-3xl")}>
          <StepBody duration={done ? REVEAL_MS.done : REVEAL_MS.step} enabled={done || moved}>
            <h1
              id={questionId}
              className={cn(
                done
                  ? "text-xs font-semibold uppercase tracking-wide text-primary-dark"
                  : "font-display text-4xl leading-[1.05] text-navy lg:text-5xl",
              )}
            >
              {current.question}
            </h1>
            <div className={done ? "mt-5" : "mt-8"}>{body}</div>
          </StepBody>
        </div>
        {!done && (
          <div className={cn(COLUMN, "flex items-center justify-between pb-8", current.key === "timing" && "lg:max-w-3xl")}>
            {step > 1 ? (
              <Button variant="ghost" data-nav onClick={back}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button size="lg" data-nav disabled={!valid} aria-describedby={current.key === "card" && attempted && !valid ? CONSENT_PROBLEM_ID : undefined} onClick={next}>
              {current.action}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
