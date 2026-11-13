"use client"

import { useId } from "react"
import { TimingChoice } from "@/components/blocks/TimingChoice"
import type { StepProps } from "./checkout-steps"

// The timing step: two questions on one screen, the spring turn-on under the
// step's own question and the fall blowout under a second heading, each as
// the TimingChoice block with Trailhead's recommendation preselected. There
// is no capacity behind any choice; Ryan places the day inside the window
// the customer prefers. The July add-on, when taken, asks nothing.

/** `questionId` is the step's h1, which asks about the turn-on; the blowout gets its own heading here. */
export function TimingStep({ state, set, questionId }: StepProps & { questionId: string }) {
  const id = useId()
  return (
    <>
      <TimingChoice kind="turn-on" labelledBy={questionId} value={state.turnOnPreference} onChange={(v) => set("turnOnPreference", v)} autofocus />
      <h2 id={`${id}-blowout`} className="mt-10 font-display text-3xl leading-[1.05] text-navy lg:text-4xl">
        And your fall blowout?
      </h2>
      <TimingChoice kind="blowout" labelledBy={`${id}-blowout`} value={state.blowoutPreference} onChange={(v) => set("blowoutPreference", v)} className="mt-6" />
      <p className="mt-6 text-base text-muted-foreground">{`${state.inspection ? "The July inspection needs no choice. " : ""}Ryan sets each day inside the window you prefer.`}</p>
    </>
  )
}
