"use client"

import { useCallback, useState } from "react"
import { dateSetText } from "@/sms/texts"
import { BookingForm, type BookingProgress } from "@/app/(booking)/booking/_screens/BookingForm"
import type { FormStep } from "@/app/(booking)/booking/_screens/booking-form-model"
import { FlowFrame, type FlowText } from "./FlowFrame"

// The booking flow as one clickable story: the real BookingForm, a Flow strip over it and the date-set text at the right once a day is booked. A service we quote ends with no day and no text:
// Ryan calls. Start over remounts the flow.
const ORIGIN = "https://www.trailheadirrigation.com"
const LABEL: Record<FormStep, string> = { zip: "Zip code", service: "Service", "quote-service": "Quote service", contact: "Contact", address: "Address", details: "Details", day: "Day and time", confirm: "Confirm", done: "Done" }

export function BookingFlowStory() {
  const [run, setRun] = useState(0)
  const [progress, setProgress] = useState<BookingProgress | null>(null)
  const [texts, setTexts] = useState<FlowText[]>([])
  const onStep = useCallback((p: BookingProgress) => {
    setProgress(p)
    if (p.step === "done" && !p.quote && p.pick?.day && p.pick.start) {
      const name = p.service?.name.toLowerCase() ?? "visit"
      const street = p.address || "412 Briggs Street"
      const body = dateSetText({ origin: ORIGIN, firstName: p.firstName || "Andrea", accountUrl: `${ORIGIN}/account`, signInUrl: `${ORIGIN}/account/sign-in`, visit: { id: "v1", name, day: p.pick.day, startTime: p.pick.start, who: "Ryan", address: street, location: `${street}, ${p.town ?? "Erie"}`, icsUrl: `${ORIGIN}/api/visits/v1/calendar.ics?token=t`, visitUrl: `${ORIGIN}/account/visits/v1?t=abc` } })
      setTexts([{ id: "date-set", channel: "text", body }])
    }
  }, [])
  const steps = (progress?.steps ?? ["zip", "service", "contact", "address", "details", "day", "confirm", "done"] as FormStep[]).map((k) => ({ key: k, label: LABEL[k] }))
  const reset = () => {
    setRun((n) => n + 1)
    setProgress(null)
    setTexts([])
  }
  return (
    <FlowFrame steps={steps} current={progress?.step ?? "zip"} onStartOver={reset} texts={texts}>
      <BookingForm key={run} onStep={onStep} />
    </FlowFrame>
  )
}
