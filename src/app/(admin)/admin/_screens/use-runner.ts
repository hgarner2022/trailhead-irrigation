"use client"

import { useState, useTransition } from "react"
import type { Outcome } from "./action-types"

/**
 * Runs one action of a panel: the buttons are disabled while it runs, and a refusal is kept as the API's own
 * words to show inline next to the thing refused (principle 5). `run` answers whether it went through.
 */
export function useRunner() {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  function run<T>(call: () => Promise<Outcome<T>>, onOk?: (data: T) => void, said = ""): void {
    setError("")
    setDone("")
    start(async () => {
      const out = await call()
      if (out.ok) {
        setDone(said)
        onOk?.(out.data)
      } else setError(out.message)
    })
  }
  return { pending, error, done, run, clear: () => (setError(""), setDone("")) }
}

/** The one line under a form: the API's refusal, or what just happened. */
export const FORM_STATUS = "text-sm empty:hidden"
