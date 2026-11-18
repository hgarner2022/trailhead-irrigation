"use client"

import { useCallback, useRef, useState } from "react"

// The side panel's width on a laptop: remembered per browser, never below 360px or above 70% of the window.
// Reads and writes of localStorage are wrapped, because a private window or blocked site data makes them throw.

export const MIN_WIDTH = 360
export const DEFAULT_WIDTH = 480
export const STEP = 40
export const MAX_SHARE = 0.7
const KEY = "trailhead.side-panel-width"

const maxWidth = () => Math.max(MIN_WIDTH, Math.floor(window.innerWidth * MAX_SHARE))
const clamp = (width: number) => Math.min(maxWidth(), Math.max(MIN_WIDTH, Math.round(width)))

function stored(): number {
  try {
    const value = Number(window.localStorage.getItem(KEY))
    return Number.isFinite(value) && value > 0 ? clamp(value) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

function remember(width: number) {
  try {
    window.localStorage.setItem(KEY, String(width))
  } catch {
    // nothing to do: the width just is not remembered
  }
}

export function usePanelWidth() {
  const [width, setWidth] = useState(stored)
  const latest = useRef(width)
  const apply = useCallback((next: number) => {
    const value = clamp(next)
    latest.current = value
    setWidth(value)
  }, [])
  /** Sets the width and remembers it: keyboard steps, and the end of a drag. */
  const commit = useCallback(
    (next: number) => {
      apply(next)
      remember(latest.current)
    },
    [apply],
  )
  /** The width while a drag is under way: shown, not yet remembered. */
  const drag = apply
  const end = useCallback(() => remember(latest.current), [])
  return { width, drag, end, commit, max: maxWidth }
}
