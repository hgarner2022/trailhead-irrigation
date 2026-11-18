// The story of a customer, a job and a visit as the panels read it: the organization's events (loaded once by live.ts) grouped by
// the record they belong to, with the messages merged in for a customer and a visit. Pure: `shape.ts` calls it, the tests call it.
import { TECH_HIDDEN_MESSAGE_KINDS, timelineOf, type TimelineEvent, type TimelineLine, type TimelineMessage } from "@/lib/events/timeline"

/** An event with the three records it belongs to (the fields of `EventOut` the grouping needs). */
export interface StoryEvent extends TimelineEvent {
  customerId: string | null
  jobId: string | null
  visitId: string | null
  /** the record the event is about (`job`, `visit`, `customer`...) and its id; absent in hand-built test events */
  about?: string
  aboutId?: string
}

/** The text of the newest `note` event about one record, from events listed newest first; null when it has none or none were loaded. */
export function newestNote(events: readonly StoryEvent[] | undefined, about: string, aboutId: string): string | null {
  const text = events?.find((e) => e.kind === "note" && e.about === about && e.aboutId === aboutId)?.detail?.text
  return typeof text === "string" && text ? text : null
}

/** A message with the customer and visit it belongs to. */
export interface StoryMessage extends TimelineMessage {
  customerId: string
  visitId: string | null
}

/** The newest lines a panel keeps for one record, the same ceiling the API puts on `customers.get` and `VisitOut`. */
export const STORY_LINES = 50

const group = <T>(rows: readonly T[], key: (row: T) => string | null): Map<string, T[]> => {
  const by = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    if (!k) continue
    const bucket = by.get(k)
    if (bucket) bucket.push(row)
    else by.set(k, [row])
  }
  return by
}

export interface Stories {
  /** every event of the customer and every message to or from them */
  ofCustomer: (customerId: string) => TimelineLine[]
  /** the events of the job: the sale, its visits, the pass, the notes */
  ofJob: (jobId: string) => TimelineLine[]
  /** the events of the visit and its messages */
  ofVisit: (visitId: string) => TimelineLine[]
}

/** An email is never shown to a tech: an event whose person has no name reads "a colleague". */
const withoutEmail = (e: StoryEvent): StoryEvent => (e.who.includes("@") && !e.whoName ? { ...e, who: "colleague" } : e)

/**
 * The three lookups, or undefined when no events were loaded (the fixtures), so a screen without them shows no block. For a tech
 * (`tech: true`, no write scope) the messages about money (receipt, bill, bill reminder, card trouble) are left out and no actor is an email.
 */
export function storiesOf(events: readonly StoryEvent[] | undefined, allMessages: readonly StoryMessage[], options: { tech?: boolean } = {}): Stories | undefined {
  if (!events) return undefined
  const tech = options.tech === true
  const messages = tech ? allMessages.filter((m) => !TECH_HIDDEN_MESSAGE_KINDS.has(m.kind)) : allMessages
  if (tech) events = events.map(withoutEmail)
  const byCustomer = group(events, (e) => e.customerId)
  const byJob = group(events, (e) => e.jobId)
  const byVisit = group(events, (e) => e.visitId)
  const messagesOfCustomer = group(messages, (m) => m.customerId)
  const messagesOfVisit = group(messages, (m) => m.visitId)
  const keep = (lines: TimelineLine[]) => lines.slice(0, STORY_LINES)
  return {
    ofCustomer: (id) => keep(timelineOf(byCustomer.get(id) ?? [], messagesOfCustomer.get(id) ?? [])),
    ofJob: (id) => keep(timelineOf(byJob.get(id) ?? [], [])),
    ofVisit: (id) => keep(timelineOf(byVisit.get(id) ?? [], messagesOfVisit.get(id) ?? [])),
  }
}
