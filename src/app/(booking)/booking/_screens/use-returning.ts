"use client"

import { useState } from "react"
import type { ContactChannel } from "@/components/blocks/ContactPreference"
import { CODE_LENGTH, FIXTURE_CODE, type Returning, type SavedCustomer } from "@/lib/booking/returning"
import type { CheckoutFields } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import type { CardChoice } from "./booking-form-model"

// The repeat customer's state in the booking form (docs/plans/2026-11-23-booking-day-time-and-repeat-research.md, section 4): "Use saved details" asks for the email, the code is sent only when pressed, and a
// right code fills the contact fields, the way we reach them and the card in; "Not you?" empties them again. A wrong code says so and nothing else. The lookup stores nothing, so a visitor who leaves leaves
// nothing. The stand-in code is the prototype's; the live form asks the server.

const CONTACT = ["firstName", "lastName", "email", "phone"] as const

export function useReturning(a: {
  initial?: { returning?: Returning }
  recognise: (email: string) => SavedCustomer | null
  fields: CheckoutFields
  set: <K extends keyof CheckoutFields>(field: K, value: CheckoutFields[K]) => void
  setChannel: (c: ContactChannel) => void
  setCard: (c: CardChoice) => void
}) {
  const { recognise, fields, set, setChannel, setCard } = a
  const [state, setState] = useState<Returning>(a.initial?.returning ?? "none")
  // The address the code goes to, kept apart from the contact fields so asking never changes what the customer typed there.
  const [email, setEmail] = useState(fields.email)
  const [problem, setProblem] = useState<"wrong" | "none" | null>(null)
  const [cardOnFile, setCardOnFile] = useState(false)
  // A verified customer is the one the code matched: read from the email, so a story can open already signed in.
  const [saved, setSaved] = useState<SavedCustomer | null>(() => (a.initial?.returning === "verified" ? recognise(fields.email) : null))

  const reset = () => {
    setState("none")
    setProblem(null)
  }
  return {
    state,
    email,
    problem,
    cardOnFile,
    /** what Trailhead holds, known only once the code is right */
    saved,
    ask: () => (setEmail(fields.email), setState("asking")),
    setEmail,
    send: () => setState("sent"),
    cancel: reset,
    /** the code typed: true when it was right. The same answer for an email we have and one we do not, until the code is entered. */
    verify: (code: string) => {
      if (code.replace(/\D/g, "").length !== CODE_LENGTH) return setProblem("wrong")
      if (code !== FIXTURE_CODE) return setProblem("wrong")
      const match = recognise(email)
      if (!match) return setProblem("none")
      for (const k of CONTACT) set(k, match[k])
      setChannel(match.channel)
      setCard("saved")
      setCardOnFile(true)
      setSaved(match)
      setProblem(null)
      setState("verified")
    },
    notYou: () => {
      for (const k of CONTACT) set(k, "")
      setChannel("text")
      if (cardOnFile) setCard(null)
      setCardOnFile(false)
      setSaved(null)
      reset()
    },
    replaceCard: () => (setCard(null), setCardOnFile(false)),
  }
}
