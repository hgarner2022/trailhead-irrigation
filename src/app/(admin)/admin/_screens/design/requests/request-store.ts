"use client"

import { useEffect, useSyncExternalStore } from "react"
import { readSent, type SentRequest } from "@/app/_flows/walkthrough/request-bridge"
import { FROM_ANDREA, photo } from "../job-fixtures"
import { REQUESTS_NOW, REQUEST_FIXTURES, type ArchiveReason, type RequestData } from "./request-model"

// The Requests the admin walkthrough holds: the fixtures, what Ryan did to them this session (opened, accepted, archived) and the requests the customer
// walkthrough sent from the booking form (read from the same browser storage the marketing choice uses). Module state read through
// `useSyncExternalStore`, so the list, the page, the rail's badge and Home's row all change together; `reset` is what Start over calls. Nothing is sent
// anywhere.

type Change = { seen?: boolean; accepted?: RequestData["accepted"]; archived?: RequestData["archived"] }

let changes: Record<string, Change> = {}
let sent: SentRequest[] = []
let version = 0
let cache: { version: number; list: RequestData[] } | null = null
const listeners = new Set<() => void>()
const bump = () => {
  version++
  cache = null
  listeners.forEach((l) => l())
}

/** A request the customer walkthrough sent, in the admin's shape: a new request, held outside Customers. */
/** The time is the fixtures' now, not the browser's: the admin world has its own clock, and a request just sent is the newest. */
export function fromSent(s: SentRequest): RequestData {
  const at = REQUESTS_NOW
  return {
    id: s.id,
    receivedAt: at,
    source: "booking-quote",
    first: s.first,
    last: s.last,
    phone: s.phone,
    email: s.email,
    contact: s.contact,
    street: s.street,
    town: s.town,
    service: s.serviceName,
    words: s.words,
    photos: s.photos.map((p, i) => photo(i + 20, { ...FROM_ANDREA, id: `${s.id}-ph${i}`, visitId: "", jobId: "", customerId: "", url: p.src, createdAt: at })),
    seen: false,
  }
}

function snapshot(): RequestData[] {
  if (cache && cache.version === version) return cache.list
  const list = [...sent.map(fromSent), ...REQUEST_FIXTURES].map((r) => {
    const c = changes[r.id]
    return c ? { ...r, seen: r.seen || Boolean(c.seen), accepted: c.accepted ?? r.accepted, archived: c.archived ?? r.archived } : r
  })
  cache = { version, list }
  return list
}

const FIXTURES = REQUEST_FIXTURES

export const requestStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  },
  getSnapshot: snapshot,
  getServerSnapshot: () => FIXTURES,
  /** Opening a request writes Seen once; a New one becomes Seen. */
  markSeen(id: string) {
    if (changes[id]?.seen) return
    const was = snapshot().find((r) => r.id === id)
    if (!was || was.seen) return
    changes = { ...changes, [id]: { ...changes[id], seen: true } }
    bump()
  },
  accept(id: string, accepted: NonNullable<RequestData["accepted"]>) {
    changes = { ...changes, [id]: { ...changes[id], seen: true, accepted } }
    bump()
  },
  archive(id: string, reason: ArchiveReason, at: string) {
    changes = { ...changes, [id]: { ...changes[id], seen: true, archived: { reason, at } } }
    bump()
  },
  /** Re-reads what the booking form sent; called when the list mounts and when another frame writes. */
  refresh() {
    const next = readSent()
    if (JSON.stringify(next) === JSON.stringify(sent)) return
    sent = next
    bump()
  },
  /** Start over: what Ryan did this session is forgotten. What the customer sent stays until the customer walkthrough starts over. */
  reset() {
    changes = {}
    bump()
  },
}

/** Every request, newest state: subscribes the caller and reads what the customer walkthrough sent. */
export function useRequests(): RequestData[] {
  useEffect(() => {
    requestStore.refresh()
    const on = () => requestStore.refresh()
    window.addEventListener("storage", on)
    return () => window.removeEventListener("storage", on)
  }, [])
  return useSyncExternalStore(requestStore.subscribe, requestStore.getSnapshot, requestStore.getServerSnapshot)
}

export const requestById = (list: readonly RequestData[], id: string) => list.find((r) => r.id === id)
