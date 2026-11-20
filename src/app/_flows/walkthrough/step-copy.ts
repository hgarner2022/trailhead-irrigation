import type { StepKey } from "./routes"

// What the step column says about each step of the customer walkthrough: one plain sentence to you, who you are (Andrea Dalton, a customer), what you
// are looking at and what to tap. Never "she" or "he" (Hannah, Nov 19 2026).

export const STEP_COPY: Record<StepKey, { line: string }> = {
  book: { line: "You are Andrea Dalton, booking a repair online. Answer each question and tap Continue. Pick any day and time." },
  texts: { line: "You just booked. This is the text you get the moment the day is set. Tap the link in it, or switch to Mail." },
  account: { line: "This is your Trailhead account: your next visit, an invoice to pay and your Season Pass. Tap anything." },
  visits: { line: "This is a visit of yours. Tap Reschedule to pick another day and time, then confirm." },
  pay: { line: "Ryan sent you an invoice. Tap Pay by card, then View the receipt." },
  receipts: { line: "You paid. This is the receipt you get: a text, an email and a page. Tap a chip to see another way of paying." },
  pass: { line: "This is your Season Pass. Tap See it from November 1, then Reserve next season." },
  details: { line: "These are your details: your phone, your yard notes and how we reach you. Change anything." },
}
