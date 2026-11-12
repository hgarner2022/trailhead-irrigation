"use client"

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { BlowoutWeek, Pass } from "@/lib/admin/types"
import { STEPS, STEP_COUNT, canContinue, toPass, useCheckoutState, type CheckoutFields } from "./checkout-state"
import { AddressStep, CardStep, ContactStep, DoneStep, WeekStep, ZonesStep, useReveal } from "./checkout-steps"

// The Season Pass checkout as six full-screen questions, one input each, the
// way Typeform paces a form: a thin orange line across the top for progress,
// the question in the display face, the trail photo faint behind the cream
// canvas, Enter to continue and the arrow keys to move. Only the current step
// is rendered, so there is no page to scroll between questions. State is the
// reducer in checkout-state.ts; nothing here fetches or charges. The card
// step is a placeholder until Stripe is wired. Client component.

export interface CheckoutFlowProps {
  weeks: BlowoutWeek[]
  season: number
  /** carried in from the Season Pass calculator */
  initialZones?: number
  /** open on this step; stories use it with `prefill` */
  initialStep?: number
  prefill?: Partial<CheckoutFields>
  /** called once, when the card step is passed */
  onComplete?: (pass: Pass) => void
  onSaveImage?: (pass: Pass) => void
  onDone?: () => void
}

const BACKDROP = "/images/trail-mountain-meadow.jpg"
const LOGO = "/images/logo-badge.png"
const COLUMN = "mx-auto w-full max-w-2xl container-padding-x"

/** Elements that use Enter and the arrow keys themselves. */
function ownsKeys(target: HTMLElement): boolean {
  const role = target.getAttribute("role")
  return target.tagName === "SELECT" || target.tagName === "TEXTAREA" || role === "combobox" || role === "listbox" || role === "option" || !!target.closest('[data-slot="select-content"]')
}

function StepBody({ children }: { children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>(300)
  return <div ref={ref}>{children}</div>
}

export function CheckoutFlow({ weeks, season, initialZones, initialStep, prefill, onComplete, onSaveImage, onDone }: CheckoutFlowProps) {
  const [state, dispatch] = useCheckoutState({ ...(initialZones ? { zones: initialZones } : {}), ...prefill, ...(initialStep ? { step: initialStep } : {}) })
  // The step on which Enter was pressed too early, so the contact step shows what is missing.
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null)
  const section = useRef<HTMLElement>(null)
  const questionId = useId()
  const { step } = state
  const current = STEPS[step - 1]
  const done = current.key === "done"
  const valid = canContinue(state, weeks)
  const attempted = attemptedStep === step
  const pass = useMemo(() => toPass(state, season, weeks), [state, season, weeks])

  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const next = () => {
    if (!valid) {
      setAttemptedStep(step)
      return
    }
    if (current.key === "card") onComplete?.(toPass({ ...state, cardSaved: true }, season, weeks))
    dispatch({ type: "next", weeks })
  }
  const back = () => dispatch({ type: "back" })

  // Each step opens with its input focused, or the section itself where there is none to type in.
  useEffect(() => {
    const el = section.current
    const target = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el
    target?.focus({ preventScroll: true })
  }, [step])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (ownsKeys(target) || event.altKey || event.metaKey || event.ctrlKey) return
    const nav = target.closest("[data-nav]")
    if (event.key === "Enter") {
      // A button answers Enter itself; a pressed pill or week card already holds its answer, so Enter moves on.
      if (nav || (target.tagName === "BUTTON" && target.getAttribute("aria-pressed") !== "true")) return
      event.preventDefault()
      if (!done) next()
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      if (!done && valid) next()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      if (step > 1) back()
    }
  }

  let body: React.ReactNode
  switch (current.key) {
    case "address":
      body = <AddressStep state={state} set={set} />
      break
    case "zones":
      body = <ZonesStep state={state} set={set} />
      break
    case "week":
      body = <WeekStep state={state} set={set} weeks={weeks} />
      break
    case "contact":
      body = <ContactStep state={state} set={set} attempted={attempted} />
      break
    case "card":
      body = <CardStep />
      break
    default:
      body = <DoneStep pass={pass} email={state.email} onSaveImage={() => onSaveImage?.(pass)} onDone={onDone} />
  }

  return (
    <div data-slot="checkout-flow" data-step={current.key} className="relative isolate min-h-svh bg-cream text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image src={BACKDROP} alt="" fill sizes="100vw" className="object-cover opacity-[0.07]" />
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
        <Image src={LOGO} alt="Trailhead Lawn & Irrigation" width={51} height={36} className="h-9 w-auto" />
        <span data-slot="checkout-counter" className="text-xs text-muted-foreground tabular-nums">{`${step} of ${STEP_COUNT}`}</span>
      </header>
      <p aria-live="polite" className="sr-only">{`Step ${step} of ${STEP_COUNT}, ${current.question}`}</p>

      <section key={step} ref={section} tabIndex={-1} aria-labelledby={questionId} onKeyDown={onKeyDown} className="flex min-h-svh flex-col outline-none">
        <div className={cn(COLUMN, "flex flex-1 flex-col justify-center pt-20 pb-8", current.key === "week" && "lg:max-w-4xl")}>
          <StepBody>
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
          <div className={cn(COLUMN, "flex items-center justify-between pb-8", current.key === "week" && "lg:max-w-4xl")}>
            {step > 1 ? (
              <Button variant="ghost" data-nav onClick={back}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button size="lg" data-nav disabled={!valid} onClick={next}>
              {current.action}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
