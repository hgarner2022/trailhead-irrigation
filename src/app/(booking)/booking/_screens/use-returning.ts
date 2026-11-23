"use client"

import { useState } from "react"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import type { LinkChannel, Returning, SavedCustomer } from "@/lib/booking/returning"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import type { CardChoice } from "./booking-form-model"

// The returning customer's state in the booking form (docs/plans/2026-11-19-booking-form-design.md, "Repeat customers (Nov 22 2026)"): a match at the contact step offers a link; the link is sent only when
// pressed; opened, it fills the contact fields, the way we reach them and the card in; "Not you?" empties them again. The lookup stores nothing, so a visitor who leaves leaves nothing.

const CONTACT = ["firstName", "lastName", "email", "phone"] as const

export function useReturning(a: {
  initial?: { returning?: Returning; via?: LinkChannel }
  recognise: (contact: { email: string; phone: string }) => SavedCustomer | null
  fields: CheckoutFields
  /** the contact step of a booking: the only place a match is looked for */
  active: boolean
  set: <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => void
  setChannel: (c: ContactChannel) => void
  setCard: (c: CardChoice) => void
}) {
  const { recognise, fields, active, set, setChannel, setCard } = a
  const [state, setState] = useState<Returning>(a.initial?.returning ?? "none")
  const [via, setVia] = useState<LinkChannel>(a.initial?.via ?? "text")
  const [cardOnFile, setCardOnFile] = useState(false)
  const match = active ? recognise({ email: fields.email, phone: fields.phone }) : null

  // Worked out each render: the offer shows while something matches and nothing has been chosen; with nothing matching, only a verified customer stays shown.
  const shown: Returning = state === "none" ? (match ? "offer" : "none") : !match && state !== "verified" ? "none" : state

  return {
    state: shown,
    via,
    cardOnFile,
    /** what Trailhead holds, known only once the customer has opened the link */
    saved: state === "verified" ? match : null,
    send: (c: LinkChannel) => (setVia(c), setState("sent")),
    skip: () => setState("declined"),
    verify: () => {
      if (!match) return
      for (const k of CONTACT) set(k, match[k])
      setChannel(match.channel)
      setCard("saved")
      setCardOnFile(true)
      setState("verified")
    },
    notYou: () => {
      for (const k of CONTACT) set(k, "")
      setChannel("text")
      if (cardOnFile) setCard(null)
      setCardOnFile(false)
      setState("declined")
    },
    replaceCard: () => (setCard(null), setCardOnFile(false)),
  }
}
