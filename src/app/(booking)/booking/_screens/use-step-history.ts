"use client"

import { useEffect, useRef } from "react"
import type { FormStep } from "./booking-form-model"

// One browser-history entry per step (docs/plans/2026-11-19-booking-form-design.md, "Navigation and close"): moving on pushes an entry that carries the step, and the browser's Back or Forward fires
// `popstate` with it, so the phone's Back button goes to the previous step and never out of the form, with every answer kept (the answers live in the screen, not in the entry). The first entry is
// the step the form opened on. Back on the screen calls `back`, which is the browser's Back while there is a step behind in this form. Once booked, Back is ignored so Confirm cannot book twice.

interface Mark {
  i: number
  step: FormStep
}
const markOf = (): Mark | null => (window.history.state as { booking?: Mark } | null)?.booking ?? null
const write = (kind: "push" | "replace", mark: Mark) => {
  const state = { ...((window.history.state as object | null) ?? {}), booking: mark }
  if (kind === "push") window.history.pushState(state, "")
  else window.history.replaceState(state, "")
}

export function useStepHistory(step: FormStep, setStep: (s: FormStep) => void, done: boolean) {
  const finished = useRef(done)
  finished.current = done
  useEffect(() => {
    write("replace", { i: markOf()?.i ?? 0, step })
    const onPop = (e: PopStateEvent) => {
      const m = (e.state as { booking?: Mark } | null)?.booking
      if (m && !finished.current) setStep(m.step)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return {
    /** show a step and add it to the history */
    push: (to: FormStep) => {
      write("push", { i: (markOf()?.i ?? 0) + 1, step: to })
      setStep(to)
    },
    /** go back one entry; false when there is none behind (the caller shows the step before) */
    back: () => {
      if ((markOf()?.i ?? 0) <= 0) return false
      window.history.back()
      return true
    },
  }
}
