/**
 * Settings › Messages, as pure functions: the rows the office may edit (the day-of voice and the invoice reminder text), the
 * reducer that saves one, the rules that stop a save, and the preview, which runs the same renderer a customer's message goes
 * through on a real visit. Receipts, invoices, card, cancel, purchase and renewal are not here: they carry money and consent
 * wording (docs/plans/2026-11-18-messages-design.md section 5). The words and rules live in `src/emails/editable.ts`.
 */
import { EDITABLE_MESSAGES, templateProblem, textParts, type Channel, type Overrides } from "@/emails/editable"
import { renderEmail } from "@/emails/render"
import { SMS_TEMPLATES, type SmsKind } from "@/sms/texts"
import { dayOf } from "@/lib/admin/calendar"
import { KIND_WORDS, TIME_ZONE } from "@/lib/admin/format"
import { customerFacingFirstName } from "@/lib/portal/words"
import type { AdminData, MessageTemplate, OrganizationSettings } from "@/lib/admin/types"
import { record, type Actor, type SettingsState } from "./settings-model"

export const channelWord = (channel: Channel) => (channel === "sms" ? "Text" : "Email")

/** The row's name: "Day before, text". */
export const messageName = (m: Pick<MessageTemplate, "key" | "channel">) => EDITABLE_MESSAGES.find((e) => e.key === m.key && e.channel === m.channel)?.name ?? m.key

/** What the sender adds under the field that the office cannot take out. */
export const lockedWords = (m: Pick<MessageTemplate, "key" | "channel">) => EDITABLE_MESSAGES.find((e) => e.key === m.key && e.channel === m.channel)?.locked ?? ""

/** The rows the screen lists: only the editable ones, in the order they ship, each with what is saved. */
export const editableRows = (messages: MessageTemplate[]): MessageTemplate[] =>
  EDITABLE_MESSAGES.map((e) => messages.find((m) => m.key === e.key && m.channel === e.channel) ?? { key: e.key, channel: e.channel, body: e.body, enabled: true })

/** Saves new words for one message. Words that break a rule, or a message the office does not edit, change nothing. */
export function setMessage(state: SettingsState, key: string, channel: Channel, body: string, actor: Actor): SettingsState {
  const text = body.trim()
  if (templateProblem(key, channel, text)) return state
  const rows = editableRows(state.settings.messages)
  const row = rows.find((m) => m.key === key && m.channel === channel)
  if (!row) return state
  const messages = rows.map((m) => (m === row ? { ...m, body: text } : m))
  return record(state, actor, messageName(row), row.body, text, { ...state.settings, messages })
}

/** The words that stop a save, said before anything is written. */
export const messageProblems = (settings: Pick<OrganizationSettings, "messages">): string[] =>
  settings.messages.flatMap((m) => {
    const problem = EDITABLE_MESSAGES.some((e) => e.key === m.key && e.channel === m.channel) ? templateProblem(m.key, m.channel, m.body) : null
    return problem ? [`${messageName(m)}: ${problem}`] : []
  })

/** A sample visit for the preview: the first scheduled visit someone has, else plain stand-ins. */
function sampleVisit(data: AdminData) {
  const visit = data.visits.find((v) => (v.scheduledOn || v.startAt) && v.personId)
  const person = visit ? data.settings.people.find((p) => p.id === visit.personId) : undefined
  const client = visit ? data.clients.find((c) => c.id === visit.clientId) : undefined
  const address = client?.address ?? "412 Ash St"
  const day = visit ? (visit.scheduledOn ?? (visit.startAt ? dayOf(visit.startAt, TIME_ZONE) : "2027-05-05")) : "2027-05-05"
  return {
    id: visit?.id ?? "sample",
    name: visit ? KIND_WORDS[visit.kind] : "spring turn-on",
    day,
    startTime: visit?.startTime ?? "08:00",
    who: visit ? customerFacingFirstName(person?.name) : "Ryan",
    address,
    location: `${address}, ${visit?.town ?? "Erie"}`,
    icsUrl: "https://www.trailheadirrigation.com/api/visits/sample/calendar.ics",
  }
}

export interface MessagePreview {
  subject: string | null
  text: string
  /** how many parts a text goes as; null for an email */
  parts: number | null
  length: number
}

/** The message exactly as a customer gets it, built by the real renderer from the words in `message`; a text shows its length in parts. */
export function previewMessage(message: MessageTemplate, data: AdminData): MessagePreview {
  const origin = "https://www.trailheadirrigation.com"
  const firstName = data.passes[0]?.firstName ?? "Alex"
  const base = { origin, firstName, accountUrl: `${origin}/account`, signInUrl: `${origin}/account/sign-in` }
  const templates: Overrides = { [`${message.key}:${message.channel}`]: message.body }
  const visitData = { ...base, visit: sampleVisit(data) }
  const invoiceData = { ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", address: visitData.visit.address, lines: [{ name: "Repair", amount: 145 }], amount: 145, tax: 0, total: 145, dueOn: "2027-05-21", payUrl: `${origin}/pay/sample?token=sample` }
  const input = message.key === "invoice-reminder" ? invoiceData : visitData
  if (message.channel === "sms") {
    const text = SMS_TEMPLATES[message.key as SmsKind](input as never, { optOut: true, templates })
    return { subject: null, text, parts: textParts(text), length: text.length }
  }
  const email = renderEmail(message.key, input, templates)
  const text = email?.text ?? ""
  return { subject: email?.subject ?? null, text, parts: null, length: text.length }
}
