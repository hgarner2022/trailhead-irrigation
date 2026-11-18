/**
 * The catalog's events for the Notes and history block in the three panels: Joe Hart's repair (the Visits panel), Andrea Dalton
 * (the Customers panel) and Andrea's Season Pass (the Passes panel). Raw events and messages, so a story builds its lines the way
 * the live data does (`timelineOf`) and the tech variant reads them the way a tech's API call does (`techEvent`: no payments, no
 * card, no consent, no contact). Used by the stories only.
 */
import { timelineOf, type TimelineEvent, type TimelineLine, type TimelineMessage } from "@/lib/events/timeline"
import { techEvent } from "@/lib/events/words"

const RYAN = "ryan@trailheadirrigation.com"
const ev = (id: string, at: string, kind: string, who: string, detail: Record<string, unknown>): TimelineEvent => ({ id, at, kind, who, detail, whoName: who === RYAN ? "Ryan Garner" : null })
const msg = (id: string, at: string, channel: "email" | "sms", kind: string): TimelineMessage => ({ id, channel, kind, status: "delivered", sentAt: at, createdAt: at })

/** Joe Hart's repair, done and paid by check: the sale, the day, a note, done and the money. */
export const JOE_EVENTS: TimelineEvent[] = [
  ev("evt-j1", "2026-11-05T15:00:00Z", "job.sold", RYAN, { source: "office", name: "Repair" }),
  ev("evt-j2", "2026-11-05T15:01:00Z", "visit.scheduled", RYAN, { name: "Repair", day: "2026-11-09" }),
  ev("evt-j3", "2026-11-06T17:20:00Z", "note", RYAN, { text: "Joe works nights, so text instead of calling.\nThe valve box is by the mailbox." }),
  ev("evt-j4", "2026-11-09T22:00:00Z", "visit.done", RYAN, { name: "Repair", completedOn: "2026-11-09", paidBy: "check" }),
  ev("evt-j5", "2026-11-09T22:00:01Z", "payment.succeeded", RYAN, { amount: 145, method: "check", name: "Repair" }),
]
export const JOE_MESSAGES: TimelineMessage[] = [msg("m-j1", "2026-11-09T22:05:00Z", "email", "receipt")]

/** Andrea Dalton as a customer: her pass bought online, her card, her choices, a note and the two messages she was sent. */
export const ANDREA_EVENTS: TimelineEvent[] = [
  ev("evt-a1", "2026-11-02T15:10:00Z", "job.sold", "customer", { source: "website", name: "Season Pass", passNumber: "TH-2027-0001" }),
  ev("evt-a2", "2026-11-02T15:10:01Z", "consent", "customer", { marketingOptIn: true, marketingChannels: ["email", "sms"], source: "checkout" }),
  ev("evt-a3", "2026-11-02T15:10:02Z", "card.saved", "customer", { brand: "visa", last4: "4242" }),
  ev("evt-a4", "2026-11-03T14:00:00Z", "visit.scheduled", "system", { name: "Spring turn-on", day: "2027-05-03" }),
  ev("evt-a5", "2026-11-09T16:30:00Z", "customer.edited", RYAN, { changed: { phone: { from: null, to: "+19705550123" } } }),
  ev("evt-a6", "2026-11-10T18:15:00Z", "note", RYAN, { text: "Andrea would like the first Monday in May if it can be done.\nBack gate is on the property notes." }),
]
export const ANDREA_MESSAGES: TimelineMessage[] = [msg("m-a1", "2026-11-02T15:11:00Z", "email", "purchase-confirmation"), msg("m-a2", "2026-11-03T14:05:00Z", "sms", "date-set")]

/** Andrea's Season Pass, the job: the sale, her choices, the early May timing she asked for and a note. */
export const PASS_EVENTS: TimelineEvent[] = [
  ev("evt-p1", "2026-11-02T15:10:00Z", "job.sold", "customer", { source: "website", name: "Season Pass", passNumber: "TH-2027-0001" }),
  ev("evt-p2", "2026-11-02T15:10:01Z", "consent", "customer", { marketingOptIn: true, marketingChannels: ["email", "sms"], source: "checkout" }),
  ev("evt-p3", "2026-11-03T14:00:00Z", "visit.scheduled", "system", { name: "Spring turn-on", day: "2027-05-03" }),
  ev("evt-p4", "2026-11-08T19:00:00Z", "pass.preference-changed", "customer", { visit: "turn-on", from: "recommended", to: "earlier" }),
  ev("evt-p5", "2026-11-10T18:15:00Z", "note", RYAN, { text: "Andrea would like the first Monday in May if it can be done." }),
]

/** The lines of a story as the panel gets them; a tech reads the events through `techEvent`, so the money, card, consent and contact lines are not there. */
export const storyOf = (events: TimelineEvent[], messages: TimelineMessage[] = [], tech = false): TimelineLine[] =>
  timelineOf(tech ? events.flatMap((e) => techEvent(e) ?? []) : events, messages)

/** The rows with one of them carrying `timeline`. */
export const withTimeline = <T extends { id: string }>(rows: T[], id: string, timeline: TimelineLine[]): T[] => rows.map((r) => (r.id === id ? { ...r, timeline } : r))
