"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// The minute between Place and the text (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): "Texts from Place and Place all wait 60 seconds under a counting strip; Undo
// inside the minute sends nothing." A batch is what one Place or one Place all did: when its minute is up `commit` runs (the API call that books it and
// texts the customer, through the existing Move path); `undo` inside the minute runs `cancel` and `commit` never does. A batch still waiting when the
// screen goes away commits at once (leaving the page is not an Undo). With `seconds` of 0 a batch commits as it is added, which is what the
// tests and a catalog with no texts want. Timers live here and nowhere else.

export const TEXT_DELAY_SECONDS = 60

export interface QueuedBatch {
  id: number
  /** first names, for the strip */
  names: string[]
  /** when the minute is up, ms since the epoch */
  due: number
  commit: () => void
  cancel: () => void
}

export interface TextingQueue {
  batches: QueuedBatch[]
  /** whole seconds left in a batch, never below zero */
  secondsLeft: (batch: QueuedBatch) => number
  add: (names: string[], commit: () => void, cancel: () => void) => void
  undo: (id: number) => void
}

export function useTextingQueue(seconds: number = TEXT_DELAY_SECONDS): TextingQueue {
  const [batches, setBatches] = useState<QueuedBatch[]>([])
  const [now, setNow] = useState(() => Date.now())
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const live = useRef<QueuedBatch[]>([])
  const next = useRef(0)
  useEffect(() => {
    live.current = batches
  })

  const drop = useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setBatches((b) => b.filter((x) => x.id !== id))
  }, [])

  const add = useCallback(
    (names: string[], commit: () => void, cancel: () => void) => {
      if (seconds <= 0) return commit()
      const id = ++next.current
      const started = Date.now()
      setNow(started)
      const batch: QueuedBatch = { id, names, due: started + seconds * 1000, commit, cancel }
      timers.current.set(id, setTimeout(() => (drop(id), commit()), seconds * 1000))
      setBatches((b) => [...b, batch])
    },
    [seconds, drop],
  )

  const undo = useCallback(
    (id: number) => {
      const batch = live.current.find((b) => b.id === id)
      if (!batch) return
      drop(id)
      batch.cancel()
    },
    [drop],
  )

  // The strip counts in whole seconds: one tick a second while anything waits.
  useEffect(() => {
    if (batches.length === 0) return
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [batches.length])

  // Leaving the page sends what is waiting.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer)
        live.current.find((b) => b.id === id)?.commit()
      }
      pending.clear()
    }
  }, [])

  const secondsLeft = useCallback((batch: QueuedBatch) => Math.max(0, Math.ceil((batch.due - now) / 1000)), [now])
  return { batches, secondsLeft, add, undo }
}
