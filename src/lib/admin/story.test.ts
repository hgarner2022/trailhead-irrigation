import { describe, expect, it } from "vitest"
import { STORY_LINES, storiesOf, type StoryEvent, type StoryMessage } from "./story"

const event = (id: string, at: string, over: Partial<StoryEvent> = {}): StoryEvent => ({
  id, at, kind: "note", detail: { text: id }, who: "ryan@example.com", whoName: "Ryan Garner", customerId: "c1", jobId: null, visitId: null, ...over,
})
const message = (id: string, at: string, over: Partial<StoryMessage> = {}): StoryMessage => ({
  id, channel: "sms", kind: "day-before", status: "sent", sentAt: at, createdAt: at, customerId: "c1", visitId: null, ...over,
})

const events: StoryEvent[] = [
  event("e-sold", "2026-11-01T10:00:00Z", { kind: "job.sold", detail: { source: "office", name: "Repair" }, jobId: "j1" }),
  event("e-sched", "2026-11-02T10:00:00Z", { kind: "visit.scheduled", detail: { name: "Repair", day: "2026-11-09" }, jobId: "j1", visitId: "v1" }),
  event("e-note-visit", "2026-11-03T10:00:00Z", { jobId: "j1", visitId: "v1" }),
  event("e-note-job", "2026-11-04T10:00:00Z", { jobId: "j1" }),
  event("e-note-customer", "2026-11-05T10:00:00Z"),
  event("e-other", "2026-11-06T10:00:00Z", { customerId: "c2", jobId: "j2", visitId: "v2" }),
]
const messages: StoryMessage[] = [message("m-visit", "2026-11-07T10:00:00Z", { visitId: "v1" }), message("m-customer", "2026-11-08T10:00:00Z"), message("m-other", "2026-11-09T10:00:00Z", { customerId: "c2" })]

describe("storiesOf", () => {
  const stories = storiesOf(events, messages)!

  it("gives a customer every event of theirs and every message to them, newest first", () => {
    expect(stories.ofCustomer("c1").map((l) => l.id)).toEqual(["m-customer", "m-visit", "e-note-customer", "e-note-job", "e-note-visit", "e-sched", "e-sold"])
  })

  it("gives a job the events that carry its id, with no messages", () => {
    expect(stories.ofJob("j1").map((l) => l.id)).toEqual(["e-note-job", "e-note-visit", "e-sched", "e-sold"])
    expect(stories.ofJob("j2").map((l) => l.id)).toEqual(["e-other"])
  })

  it("gives a visit its own events and its own messages", () => {
    expect(stories.ofVisit("v1").map((l) => l.id)).toEqual(["m-visit", "e-note-visit", "e-sched"])
  })

  it("reads the words, the actor and the note text of each line", () => {
    expect(stories.ofVisit("v1")[2]).toMatchObject({ actor: "Ryan", what: "Repair scheduled for Nov 9", kind: "event" })
    expect(stories.ofVisit("v1")[1]).toMatchObject({ what: "e-note-visit", note: "e-note-visit" })
    expect(stories.ofVisit("v1")[0]).toMatchObject({ actor: "Trailhead", what: "Text sent: day-before reminder", kind: "message" })
  })

  it("gives a record with no events an empty story, never someone else's", () => {
    expect(stories.ofCustomer("c9")).toEqual([])
    expect(stories.ofJob("j9")).toEqual([])
    expect(stories.ofVisit("v9")).toEqual([])
  })

  it("keeps the newest fifty lines of a long story", () => {
    const many = Array.from({ length: STORY_LINES + 10 }, (_, n) => event(`e${String(n).padStart(3, "0")}`, `2026-10-${String(1 + Math.floor(n / 24)).padStart(2, "0")}T${String(n % 24).padStart(2, "0")}:00:00Z`))
    const lines = storiesOf(many, [])!.ofCustomer("c1")
    expect(lines).toHaveLength(STORY_LINES)
    expect(lines[0]!.id).toBe("e059")
  })

  it("is undefined when no events were loaded, so a screen without them shows no block", () => {
    expect(storiesOf(undefined, messages)).toBeUndefined()
  })

  it("gives a tech no message about money and never an email as the actor", () => {
    const mixed: StoryMessage[] = [
      message("m-day", "2026-11-07T10:00:00Z"),
      ...["receipt", "invoice", "invoice-reminder", "card-failed", "card-expiring"].map((kind, n) => message(`m-${kind}`, `2026-11-08T1${n}:00:00Z`, { kind })),
    ]
    const staffEvents: StoryEvent[] = [
      event("e-named", "2026-11-03T10:00:00Z"),
      event("e-nameless", "2026-11-04T10:00:00Z", { who: "pat@example.com", whoName: null }),
      event("e-system", "2026-11-05T10:00:00Z", { who: "system", whoName: null }),
    ]
    const asStaff = storiesOf(staffEvents, mixed)!.ofCustomer("c1")
    expect(asStaff.map((l) => l.id)).toContain("m-receipt")
    expect(asStaff.find((l) => l.id === "e-nameless")!.actor).toBe("Pat")
    const asTech = storiesOf(staffEvents, mixed, { tech: true })!.ofCustomer("c1")
    expect(asTech.map((l) => l.id)).toEqual(["m-day", "e-system", "e-nameless", "e-named"])
    expect(asTech.find((l) => l.id === "e-nameless")!.actor).toBe("a colleague")
    expect(asTech.find((l) => l.id === "e-named")!.actor).toBe("Ryan")
    expect(asTech.find((l) => l.id === "e-system")!.actor).toBe("Trailhead")
    expect(JSON.stringify(asTech)).not.toContain("@")
  })
})
