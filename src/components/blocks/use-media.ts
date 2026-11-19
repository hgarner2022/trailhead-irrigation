"use client"

import { useSyncExternalStore } from "react"

// One subscribe function per query, so useSyncExternalStore keeps its listener across renders.
const subscribers = new Map<string, (onChange: () => void) => () => void>()
const subscribeTo = (query: string) => {
  let subscribe = subscribers.get(query)
  if (!subscribe) {
    subscribe = (onChange) => {
      if (typeof window.matchMedia !== "function") return () => undefined
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    }
    subscribers.set(query, subscribe)
  }
  return subscribe
}

/** A media query as a store: current on the client, `false` on the server. The Sidebar primitive keeps its own `useIsMobile` for its sheet. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(subscribeTo(query), () => typeof window.matchMedia === "function" && window.matchMedia(query).matches, () => false)
}
