// The story of a customer, a job and a visit as the panels read it: the organization's events (loaded once by live.ts) grouped by
// the record they belong to, with the messages merged in for a customer and a visit. Pure: `shape.ts` calls it, the tests call it.
import { timelineOf, type TimelineEvent, type TimelineLine, type TimelineMessage } from "@/lib/events/timeline"

/** An event with the three records it belongs to (the fields of `EventOut` the grouping needs). */
export interface StoryEvent extends TimelineEvent {
  customerId: string | null
  jobId: string | null
  visitId: string | null
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
    if (k) by.set(k, [...(by.get(k) ?? []), row])
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

/** The three lookups, or undefined when no events were loaded (the fixtures), so a screen without them shows no block. */
export function storiesOf(events: readonly StoryEvent[] | undefined, messages: readonly StoryMessage[]): Stories | undefined {
  if (!events) return undefined
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
