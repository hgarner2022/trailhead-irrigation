// What the customer chose about marketing in the customer walkthrough, kept in the browser so the admin walkthrough's Consent card can show it
// ("Opted in today on the booking form"). The two walkthroughs run in different frames; this is the only thing they share. Reads and
// writes never throw (storage can be blocked).

const KEY = "trailhead-walkthrough-marketing"

export interface MarketingChoice {
  email?: boolean
  text?: boolean
  /** where the email choice was made: the booking form (the booking is the opt-in), the account's Details switch, or the unsubscribe link on a marketing email */
  emailSource?: "booking form" | "account" | "unsubscribe link"
}

export function readChoice(): MarketingChoice {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as MarketingChoice
  } catch {
    return {}
  }
}

export function writeChoice(choice: MarketingChoice) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(choice))
  } catch {
    // storage blocked: the prototype still works, the admin just shows its fixture
  }
}

/** The tips email the walkthrough sends once marketing email is on. It carries the Unsubscribe link. */
export const MARKETING_MAIL = {
  id: "marketing-email",
  channel: "email" as const,
  subject: "Three spring watering tips from Trailhead",
  body: "Hi Andrea, run each zone for the same time in April, water before 9 am, and check the heads for clogs before the heat. Reply to this email if you want Ryan to look at anything.",
}
