"use client"

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Pass } from "@/lib/admin/types"
import { STEPS, STEP_COUNT, canContinue, stepProblems, toPass, type CheckoutFields, type CheckoutState } from "./checkout-state"
import type { PlaceProvider } from "@/lib/places"
import { AddressStep } from "./checkout-address"
import { CONSENT_PROBLEM_ID, ContactStep, DoneStep, ZonesStep, useReveal } from "./checkout-steps"
import { useCheckoutState } from "./use-checkout-state"
import { useCheckoutServer } from "./use-checkout-server"
import { useCheckoutStorage } from "./use-checkout-storage"
import { CardStep } from "./checkout-card"
import { ErrorSummary } from "./checkout-errors"
import type { BeginCheckout, FinishCheckout, RecordConsent } from "./checkout-submit"
import { savePassImage } from "@/lib/pass-card-image"
import { InspectionStep } from "./checkout-inspection"
import { TimingStep } from "./checkout-timing"
import { ownsKeys, timingNeighbour } from "./checkout-keys"

// The Season Pass checkout as seven full-screen questions, one input each (the
// timing step asks its two together), the way Typeform paces a form: a thin orange line across the top for progress,
// the question in the display face, the trail photo faint behind the cream
// canvas, Enter to continue and the arrow keys to move. Only the current step
// is rendered, so there is no page to scroll between questions. State is the
// reducer in checkout-state.ts. Wired (a Stripe key plus onBegin and onFinish,
// which the page passes from the server actions) the contact step makes the
// pending pass and the card form's session, the card step mounts Stripe's
// embedded form once the terms are accepted, and Stripe's completion activates
// the pass; unwired (stories, the prototype) the card step is a placeholder and
// nothing fetches. Either way the consent boxes are real and gate the card.
// Client component.

export interface CheckoutFlowProps {
  season: number
  /** carried in from the Season Pass calculator */
  initialZones?: number
  /** open on this step; stories use it with `prefill` */
  initialStep?: number
  prefill?: Omit<Partial<CheckoutState>, "step">
  /** finds addresses as the customer types; the fixture until Google Places is wired */
  places?: PlaceProvider
  /** YYYY-MM-DD in Mountain time; which visits are still on sale this season. Defaults to the day the page opens. */
  today?: string
  /** called once, when the card step is passed; Done is terminal, so the card step is never passed twice */
  onComplete?: (pass: Pass) => void
  /** saves the pass card as an image; defaults to rendering the card on screen to a PNG download */
  onSaveImage?: (pass: Pass) => void
  onDone?: () => void
  /** the publishable key of Stripe's embedded card form; with the two actions below it wires the flow, without them the card step is the placeholder */
  stripeKey?: string
  /** called when the contact step passes: makes the pending pass and the card form's session */
  onBegin?: BeginCheckout
  /** called when Stripe says the card is saved: activates the pass */
  onFinish?: FinishCheckout
  /** called when the card form opens: records the ticked boxes on the pending pass */
  onConsent?: RecordConsent
}

const BACKDROP = "/images/trail-mountain-meadow.jpg"
const LOGO = "/images/logo-badge.png"
const COLUMN = "mx-auto w-full max-w-2xl container-padding-x"
/** The reserved moment gets the long rise; a step change gets a short one; the first question opens still. */
const REVEAL_MS = { step: 300, done: 600 }

function StepBody({ duration, enabled, children }: { duration: number; enabled: boolean; children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>(duration, enabled)
  return <div ref={ref}>{children}</div>
}

export function CheckoutFlow({ season, initialZones, initialStep, prefill, places, today, onComplete, onSaveImage, onDone, stripeKey, onBegin, onFinish, onConsent }: CheckoutFlowProps) {
  const [state, dispatch] = useCheckoutState({ ...(initialZones ? { zones: initialZones } : {}), ...(today ? { today } : {}), ...prefill, ...(initialStep ? { step: initialStep } : {}) })
  // The step on which Continue (or Enter) was pressed too early, so it shows every field's problem; `n` counts the presses so each one moves focus again.
  const [attempt, setAttempt] = useState<{ step: number; n: number } | null>(null)
  const section = useRef<HTMLElement>(null)
  const questionId = useId()
  // Set on the first move, so opening the page does not animate; Done always rises.
  const [moved, setMoved] = useState(false)
  const { step } = state
  const current = STEPS[step - 1]
  const done = current.key === "done"
  const valid = canContinue(state)
  const attempted = attempt?.step === step
  const wired = Boolean(stripeKey && onBegin && onFinish)
  const markMoved = useCallback(() => setMoved(true), [])
  const { busy, begin, finishCard, retry } = useCheckoutServer({ state, dispatch, onBegin, onFinish, onComplete, onConsent, moved: markMoved })
  useCheckoutStorage(state, dispatch, wired)

  const set = <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => dispatch({ type: "set", field, value })
  const next = async () => {
    // On the wired card step only Stripe's own form saves the card; Enter and the arrows must not skip it.
    if (busy || (wired && current.key === "card")) return
    if (!valid) {
      setAttempt((prev) => ({ step, n: (prev?.n ?? 0) + 1 }))
      return
    }
    if (wired && current.key === "contact") {
      await begin()
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

  // A press that could not pass puts focus on the first field with a problem, once its message is on screen.
  useEffect(() => {
    if (!attempt) return
    section.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus()
  }, [attempt])

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
          set={set}
        />
      )
      break
    case "zones":
      body = <ZonesStep state={state} set={set} />
      break
    case "inspection":
      body = <InspectionStep state={state} set={set} />
      break
    case "timing":
      body = <TimingStep state={state} set={set} questionId={questionId} />
      break
    case "contact":
      body = <ContactStep state={state} set={set} attempted={attempted} />
      break
    case "card":
      body = <CardStep state={state} set={set} attempted={attempted} stripeKey={wired ? stripeKey : undefined} clientSecret={state.clientSecret} onCardComplete={finishCard} />
      break
    default: {
      const pass = state.pass ?? toPass(state, season)
      body = <DoneStep pass={pass} email={state.email} today={state.today} onSaveImage={() => (onSaveImage ?? savePassImage)(pass)} onDone={onDone} />
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
            {attempted && <ErrorSummary problems={stepProblems(state)} />}
            {state.notice && (
              <p role="status" data-slot="checkout-notice" className="mt-6 text-base text-muted-foreground">
                {state.notice}
              </p>
            )}
            {state.failure && (
              <div role="alert" data-slot="checkout-failure" className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-destructive">
                <p>{state.failure}</p>
                {state.retry && (
                  <Button variant="outline" size="sm" data-nav disabled={busy} onClick={retry}>
                    Try again
                  </Button>
                )}
              </div>
            )}
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
            {!(wired && current.key === "card") && (
              <Button size="lg" data-nav disabled={busy} aria-busy={busy || undefined} aria-describedby={current.key === "card" && attempted && !valid ? CONSENT_PROBLEM_ID : undefined} onClick={next}>
                {busy ? "One moment" : current.action}
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
