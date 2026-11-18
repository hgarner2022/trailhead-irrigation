// The story of a customer, a job or a visit: its events and its messages in one list, newest first. Pure: nothing is copied
// into `event`, and a message never shows its body here (the Messages block keeps the bodies).
import { eventWords, type EventForWords } from "./words"

/** An event as the timeline reads it (the fields of `EventOut`). */
export interface TimelineEvent extends EventForWords {
  id: string
  at: string
  whoName?: string | null
}

/** A message as the timeline reads it (the fields of a `message_log` row or `MessageOut`). */
export interface TimelineMessage {
  id: string
  channel: "email" | "sms"
  kind: string
  status: string
  direction?: string
  sentAt?: Date | string | null
  createdAt: Date | string
}

export interface TimelineLine {
  id: string
  /** ISO timestamp */
  at: string
  /** "Ryan", "the customer" or "Trailhead" */
  actor: string
  /** the sentence; a note's is its full text */
  what: string
  kind: "event" | "message"
  /** set on a note: its full text, for the screen to wrap and keep its line breaks */
  note?: string
}

/** What a message is called in "Text sent: day-before reminder". */
export const MESSAGE_KIND_WORDS: Record<string, string> = {
  "purchase-confirmation": "purchase confirmation",
  "date-set": "date set",
  "date-moved": "date moved",
  "day-before": "day-before reminder",
  "date-confirm": "date confirmation",
  receipt: "receipt",
  invoice: "bill",
  "invoice-reminder": "bill reminder",
  "card-failed": "card didn't go through",
  "card-expiring": "card expiring",
  cancelled: "cancellation",
  renewal: "renewal",
  note: "note",
}

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString())

function messageLine(m: TimelineMessage): TimelineLine {
  const kind = MESSAGE_KIND_WORDS[m.kind] ?? m.kind.replace(/-/g, " ")
  const channel = m.channel === "sms" ? "Text" : "Email"
  const inbound = m.direction === "in"
  const verb = inbound ? "received" : m.status === "failed" || m.status === "bounced" ? "didn't go through" : m.status === "queued" ? "queued" : m.status === "skipped" ? "not sent" : "sent"
  return {
    id: m.id,
    at: iso(m.sentAt ?? m.createdAt),
    actor: inbound ? "the customer" : "Trailhead",
    what: `${channel} ${verb}: ${kind}`,
    kind: "message",
  }
}

/** Events and messages as one list of lines, newest first; a tie on the time goes by id, so the order never changes between reads. */
export function timelineOf(events: readonly TimelineEvent[], messages: readonly TimelineMessage[]): TimelineLine[] {
  const lines: TimelineLine[] = [
    ...events.map((e): TimelineLine => {
      const { actor, what } = eventWords(e, e.whoName)
      return { id: e.id, at: iso(e.at), actor, what, kind: "event", ...(e.kind === "note" ? { note: what } : {}) }
    }),
    ...messages.map(messageLine),
  ]
  return lines.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
}
