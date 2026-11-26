"use client"

import { useEffect, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react"

// Is the focus on this control there because of the KEYBOARD? `:focus-visible` is the browser's guess, and it also says yes to a focus a script gives (a step opening on its chosen
// option) and, on some phones, to a tap; on a large filled surface such as the chosen service card that drew an orange edge round the navy one that nobody asked for (Hannah, Nov 25 2026).
// This is the fact instead: the page remembers whether the last thing the person did was press a key or use a pointer, and a control asks when it takes the focus. A focus on load, before
// any key, is not a keyboard focus. A keyboard user who presses Enter on Continue and lands on a control by script still gets the ring, because their last act was a key.

let lastWasKey = false
let listening = false

function listen() {
  if (listening || typeof document === "undefined") return
  listening = true
  document.addEventListener(
    "keydown",
    (e) => {
      // a shortcut (Cmd+R, Ctrl+L) is not moving through the page
      if (!e.metaKey && !e.ctrlKey && !e.altKey) lastWasKey = true
    },
    true,
  )
  for (const type of ["pointerdown", "mousedown", "touchstart"]) document.addEventListener(type, () => void (lastWasKey = false), { capture: true, passive: true })
}

export interface KeyboardFocus {
  /** the control holds the focus and the keyboard put it or is using it there */
  shown: boolean
  /** spread on the control that takes the focus */
  handlers: {
    onFocus: (e: FocusEvent) => void
    onBlur: (e: FocusEvent) => void
    onKeyDown: (e: KeyboardEvent) => void
    onPointerDown: (e: PointerEvent) => void
  }
}

export function useKeyboardFocus(): KeyboardFocus {
  const [shown, setShown] = useState(false)
  useEffect(listen, [])
  return {
    shown,
    handlers: {
      onFocus: () => setShown(lastWasKey),
      onBlur: () => setShown(false),
      onKeyDown: (e) => {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) setShown(true)
      },
      onPointerDown: () => setShown(false),
    },
  }
}
