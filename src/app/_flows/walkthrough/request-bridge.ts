// The request a customer sent from the booking form's "Request a quote" path, kept in the browser so the admin walkthrough's Requests list can show it
// (the same bridge the marketing consent uses, `marketing-choice.ts`: the two walkthroughs run in different frames and this is the only thing they
// share). Nothing is sent anywhere. Reads and writes never throw (storage can be blocked); a request is a held record of a person who is not a
// customer yet, so what is kept here is exactly what the form asked and nothing else.

const KEY = "trailhead-walkthrough-requests"

export interface SentRequest {
  id: string
  /** ISO time the customer pressed "Send to Ryan" */
  at: string
  first: string
  last: string
  phone: string
  email: string
  contact: "text" | "email" | "both"
  street: string
  town: string
  /** the catalogue key and name of the service asked for; empty for a plain question */
  serviceKey: string
  serviceName: string
  /** "Tell Ryan about it": the customer's own words */
  words: string
  /** the photos as the form held them: a name and a preview address */
  photos: { name: string; src: string }[]
}

export function readSent(): SentRequest[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown
    return Array.isArray(parsed) ? (parsed as SentRequest[]) : []
  } catch {
    return []
  }
}

export function writeSent(request: SentRequest) {
  try {
    const rest = readSent().filter((r) => r.id !== request.id)
    window.localStorage.setItem(KEY, JSON.stringify([request, ...rest].slice(0, 5)))
  } catch {
    // storage blocked: the prototype still works, the admin list just shows its fixtures
  }
}

export function clearSent() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
