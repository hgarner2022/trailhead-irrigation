// The words the office may change (Settings › Messages), pure like the rest of src/emails so the admin screen, the
// API and the senders share one definition. The office edits the day-of voice (date set, date moved, the two-week
// check, the day before, on the way) and the invoice reminder text; receipts, invoices, card, cancel, purchase and
// renewal carry money and consent wording and are never edited (docs/plans/2026-11-18-messages-design.md section 5).
import { ACCOUNT_NAME } from "./format"

export type Channel = "sms" | "email"

/** The placeholders a template may use, in the words the screen shows beside the field. */
export const PLACEHOLDERS = [
  { name: "firstName", about: "the customer's first name" },
  { name: "service", about: 'what is being done: "fall blowout"' },
  { name: "address", about: "the street address" },
  { name: "day", about: 'the day: "Fri, Oct 14" in a text, "Friday, October 14" in an email' },
  { name: "window", about: 'the time: "8 to 10 am"' },
  { name: "who", about: 'the person coming: "Ryan"' },
  { name: "amount", about: 'what is unpaid: "$145"' },
  { name: "due", about: 'the day an invoice is due: "May 21"' },
  { name: "payLink", about: "the pay link" },
] as const

export type PlaceholderName = (typeof PLACEHOLDERS)[number]["name"]
export const PLACEHOLDER_NAMES: readonly string[] = PLACEHOLDERS.map((p) => p.name)

export interface EditableMessage {
  key: "date-set" | "date-moved" | "date-confirm" | "day-before" | "on-the-way" | "invoice-reminder"
  channel: Channel
  /** what the screen calls the row */
  name: string
  /** the words as they ship; a text's is the middle of the message, an email's is its first sentence */
  body: string
  /** placeholders the words must keep */
  required: PlaceholderName[]
  /** the placeholders this message fills; any other is refused, since it would go out as literal braces */
  allowed: PlaceholderName[]
  /** what the sender adds that the office cannot remove, said under the field */
  locked: string
}

const TEXT_LOCKED = `Starts with "Trailhead:". Ends with the link to your ${ACCOUNT_NAME} and, on a customer's first text, "Reply STOP to opt out."`
const EMAIL_LOCKED = `Above it: the greeting ("Hi Andrea,"). Under it: the day, who is coming and where, the calendar links, a button to your ${ACCOUNT_NAME}, the sign-off and our address. The subject stays as it is.`

export const EDITABLE_MESSAGES: EditableMessage[] = [
  { key: "date-set", channel: "sms", name: "Day set, text", body: "your {service} is {day}, {window}. {who} will be there.", required: [], allowed: ["service", "address", "day", "window", "who"], locked: TEXT_LOCKED },
  { key: "date-set", channel: "email", name: "Day set, email", body: "Your {service} is set for {day}.", required: [], allowed: ["firstName", "service", "address", "day", "window", "who"], locked: EMAIL_LOCKED },
  { key: "date-moved", channel: "sms", name: "Day moved, text", body: "your {service} moved to {day}, {window}.", required: [], allowed: ["service", "address", "day", "window", "who"], locked: TEXT_LOCKED },
  { key: "date-moved", channel: "email", name: "Day moved, email", body: "Your {service} moved to {day}.", required: [], allowed: ["firstName", "service", "address", "day", "window", "who"], locked: EMAIL_LOCKED },
  { key: "date-confirm", channel: "sms", name: "Two weeks out, text", body: "your {service} is still {day}, {window}.", required: [], allowed: ["service", "address", "day", "window", "who"], locked: TEXT_LOCKED },
  { key: "date-confirm", channel: "email", name: "Two weeks out, email", body: "We're confirming your {service}: {day}.", required: [], allowed: ["firstName", "service", "address", "day", "window", "who"], locked: `${EMAIL_LOCKED} A line about what Ryan does at the visit follows your sentence.` },
  { key: "day-before", channel: "sms", name: "Day before, text", body: "{who} is coming tomorrow, {day}, {window}, for your {service}.", required: [], allowed: ["service", "address", "day", "window", "who"], locked: TEXT_LOCKED },
  { key: "day-before", channel: "email", name: "Day before, email", body: "{who} is coming tomorrow, {day}, for your {service}.", required: [], allowed: ["firstName", "service", "address", "day", "window", "who"], locked: EMAIL_LOCKED },
  { key: "on-the-way", channel: "sms", name: "On the way, text", body: "{who} is on the way to {address} for your {service}.", required: [], allowed: ["service", "address", "day", "window", "who"], locked: TEXT_LOCKED },
  { key: "invoice-reminder", channel: "sms", name: "Invoice reminder, text", body: "a reminder that {amount} for the {service} is still unpaid, due {due}. Pay here: {payLink}", required: ["amount", "payLink"], allowed: ["amount", "service", "due", "payLink"], locked: 'Starts with "Trailhead:". Ends with "Reply STOP to opt out." on a customer\'s first text.' },
]

const find = (key: string, channel: Channel) => EDITABLE_MESSAGES.find((m) => m.key === key && m.channel === channel)

/** The words as they ship for one message; "" for a kind the office does not edit. */
export const defaultBody = (key: EditableMessage["key"], channel: Channel) => find(key, channel)?.body ?? ""

/** Saved words by `key:channel`: only what the office changed and the rules allow. */
export type Overrides = Partial<Record<string, string>>
const slot = (key: string, channel: Channel) => `${key}:${channel}`

/** An older saved template read in today's words: {visit} is {service}, {date} is {day}, and {truck} and {nextVisit} go. */
export function migratePlaceholders(body: string): string {
  return tidy(body.replaceAll("{visit}", "{service}").replaceAll("{date}", "{day}").replace(/\s*\{(truck|nextVisit)\}/g, ""))
}

/** The words that stop a save, or null. Said in the voice of the screen. */
export function templateProblem(key: string, channel: Channel, body: string): string | null {
  const message = find(key, channel)
  if (!message) return "That message is not one the office edits."
  const text = body.trim()
  if (!text) return "Write something for the message."
  for (const [, name] of text.matchAll(/\{(\w+)\}/g)) {
    if (!PLACEHOLDER_NAMES.includes(name!)) return `We don't know {${name}}.`
    if (!message.allowed.includes(name as PlaceholderName)) return `{${name}} is not filled in the ${message.name.toLowerCase()}.`
  }
  if (channel === "sms") {
    if (/^trailhead\b/i.test(text)) return 'A text already starts with "Trailhead:"; start with what you want to say.'
    if (/\bSTOP\b/.test(text)) return 'The sender adds "Reply STOP to opt out." on a number\'s first text; leave it out.'
    if (text.length > 300) return "Keep a text under 300 characters, so it stays within two parts."
  }
  if (text.includes("—")) return "Take out the long dash (an em dash); use a period or a comma."
  if (text.includes("!")) return "Take out the exclamation mark."
  if (channel === "sms" && /[^\x20-\x7E]/.test(text)) return "A text takes plain letters only: no curly quotes, accents or special dashes."
  for (const name of message.required) if (!text.includes(`{${name}}`)) return `Keep {${name}} in the ${message.name.toLowerCase()}.`
  return null
}

/** The words the first version of Settings › Messages seeded into the live organization: old drafts nobody edited, never used. */
const LEGACY_SEEDED = [
  "Hi {firstName}, thanks for reserving your season with Trailhead. Your turn-on, mid-season check and blowout are on our list, and we will send the day for each one as the season comes around. Your pass and the dates live at your pass page any time you want a look.",
  "Hi {firstName}, your {visit} is booked for {date}. {who} will be there. If that day does not work, reply to this email and we will find another.",
  "Trailhead here. {who} will be there tomorrow, {date}, for your {visit}. Please leave the gate unlatched and the controller reachable. Reply STOP to stop texts.",
  "Trailhead is on the way for your {visit}. We will be there within the hour.",
  "Hi {firstName}, your {visit} is done and the receipt is attached. The next visit on your pass is the {nextVisit}, and we will send the day when it is set. Thank you for trusting us with the yard.",
  "Hi {firstName}, your season is wrapped up and next season's passes are open. Renew now and your blowout date and your repair priority carry over. The price stays the same per visit.",
]

/** What the sender uses: saved words that pass the rules, read in today's placeholders. A broken or foreign row is ignored, so a bad save never breaks a send. */
export function overridesOf(saved: { key: string; channel: Channel; body: string }[] | undefined): Overrides {
  const out: Overrides = {}
  for (const m of saved ?? []) {
    if (LEGACY_SEEDED.includes(m.body)) continue
    const body = migratePlaceholders(m.body)
    if (templateProblem(m.key, m.channel, body) === null) out[slot(m.key, m.channel)] = body
  }
  return out
}

/** The greeting is its own line under the heading ("Hi Andrea,"), so a saved sentence that opens with its own ("Hi {firstName},", "Hi, {firstName},", "Hello {firstName}") loses that opening at send time and in the Settings preview. Empty when nothing else was written. */
export function withoutGreeting(body: string): string {
  return body.replace(/^\s*(?:hi|hello|hey)\b,?\s*\{firstName\}\s*[,:.-]?\s*/i, "").trim()
}

/** A sentence that lost its opening starts with a capital again. */
export const capitalFirst = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

export const bodyOf = (overrides: Overrides | undefined, key: EditableMessage["key"], channel: Channel) => overrides?.[slot(key, channel)] ?? defaultBody(key, channel)

/** The messages the screen lists: every editable one, with what the office saved where it passes the rules. */
export function messagesWith(saved: { key: string; channel: Channel; body: string; subject?: string; enabled: boolean }[] | undefined) {
  const overrides = overridesOf(saved)
  return EDITABLE_MESSAGES.map((m) => ({ key: m.key, channel: m.channel, body: overrides[slot(m.key, m.channel)] ?? m.body, enabled: true }))
}

export interface Fill {
  firstName?: string
  service?: string
  address?: string
  day?: string
  window?: string | null
  who?: string | null
  amount?: string
  due?: string
  payLink?: string
}

function tidy(text: string): string {
  return text.replace(/\s+([.,?:;])/g, "$1").replace(/,{2,}/g, ",").replace(/\s{2,}/g, " ").trim()
}

/**
 * The template with its placeholders filled. With no one on the visit, "{who} is" reads "We're" and a sentence that says
 * "{who} will be" is left out; with no window the ", {window}" goes. A placeholder it does not know stays as written.
 */
export function fillTemplate(body: string, fill: Fill): string {
  let text = body
  if (!fill.who) {
    text = text.split(/(?<=[.?])\s+/).filter((sentence) => !sentence.includes("{who} will be")).join(" ")
    text = text.replaceAll("{who} is", "We're").replaceAll("{who}", "we")
  }
  text = fill.window ? text : text.replace(/,?\s*\{window\}/g, "")
  const values: Record<string, string | null | undefined> = { ...fill }
  text = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values && values[name] != null ? (values[name] as string) : match))
  return tidy(text)
}

/** How many parts a text goes as: 160 characters in one, 153 in each of several. */
export const textParts = (text: string) => (text.length <= 160 ? 1 : Math.ceil(text.length / 153))
