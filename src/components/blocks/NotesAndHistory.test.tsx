import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { TimelineLine } from "@/lib/events/timeline"
import { NotesAndHistory, lineDate, type NoteOutcome } from "./NotesAndHistory"

// The fixtures are dated 2026; a line shows its year only when it is not this year, so the clock is pinned (Date only, timers stay real).
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-18T19:00:00Z"))
})
afterAll(() => vi.useRealTimers())

const lines: TimelineLine[] = [
  { id: "e3", at: "2026-11-17T18:00:00Z", actor: "Ryan", what: "Spring turn-on marked done, paid by Venmo", kind: "event" },
  { id: "e2", at: "2026-11-16T15:00:00Z", actor: "Ryan", what: "Gate is open.\nDog stays inside.", kind: "event", note: "Gate is open.\nDog stays inside." },
  { id: "m1", at: "2026-11-15T16:00:00Z", actor: "Trailhead", what: "Text sent: day-before reminder", kind: "message" },
  { id: "e1", at: "2026-11-10T20:00:00Z", actor: "the customer", what: "Spring turn-on moved from Apr 20 to Apr 22", kind: "event" },
]

const items = () => within(screen.getByRole("list")).getAllByRole("listitem")
const never = async (): Promise<NoteOutcome> => ({ ok: true })

describe("NotesAndHistory", () => {
  it("has a heading and lists the lines in the order given, each as date, who and what", () => {
    render(<NotesAndHistory lines={lines} onAddNote={never} />)
    expect(screen.getByRole("heading", { name: "Notes and history" })).toBeInTheDocument()
    expect(items().map((li) => li.textContent)).toEqual([
      "Nov 17 · Ryan · Spring turn-on marked done, paid by Venmo",
      "Nov 16 · Ryan · Gate is open.\nDog stays inside.",
      "Nov 15 · Trailhead · Text sent: day-before reminder",
      "Nov 10 · the customer · Spring turn-on moved from Apr 20 to Apr 22",
    ])
    expect(items()[0]!.querySelector("time")).toHaveAttribute("dateTime", "2026-11-17T18:00:00Z")
  })

  it("keeps a note's line breaks and marks messages as the quieter lines", () => {
    render(<NotesAndHistory lines={lines} onAddNote={never} />)
    expect(items()[1]!.querySelector("[data-slot='note-text']")).toHaveClass("whitespace-pre-wrap")
    expect(items()[2]).toHaveAttribute("data-kind", "message")
    expect(items()[0]).toHaveAttribute("data-kind", "event")
    expect(items()[1]).toHaveAttribute("data-kind", "note")
  })

  it("says so when there is nothing yet, and still offers the add box", () => {
    render(<NotesAndHistory lines={[]} onAddNote={never} />)
    expect(screen.getByText("No notes or history yet. Add a note and it shows here.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Add a note")).toBeInTheDocument()
  })

  it("has one labelled form with a note box that takes 2000 characters and a button that waits for text", async () => {
    render(<NotesAndHistory lines={lines} onAddNote={never} />)
    const box = screen.getByLabelText("Add a note")
    expect(box).toHaveAttribute("maxlength", "2000")
    const button = screen.getByRole("button", { name: "Add note" })
    expect(button).toBeDisabled()
    await userEvent.type(box, "   ")
    expect(button).toBeDisabled()
    await userEvent.type(box, "Call first")
    expect(button).toBeEnabled()
  })

  it("sends the trimmed text, waits as Adding, then shows the note at the top and clears the box", async () => {
    let finish!: (out: NoteOutcome) => void
    const onAddNote = vi.fn(() => new Promise<NoteOutcome>((resolve) => (finish = resolve)))
    render(<NotesAndHistory lines={lines} onAddNote={onAddNote} />)
    await userEvent.type(screen.getByLabelText("Add a note"), "  Back gate sticks  ")
    await userEvent.click(screen.getByRole("button", { name: "Add note" }))
    expect(onAddNote).toHaveBeenCalledWith("Back gate sticks")
    expect(await screen.findByRole("button", { name: "Adding" })).toBeDisabled()
    finish({ ok: true, line: { id: "n1", at: "2026-11-18T16:00:00Z", actor: "Ryan", what: "Back gate sticks", kind: "event", note: "Back gate sticks" } })
    await waitFor(() => expect(items()[0]!.textContent).toBe("Nov 18 · Ryan · Back gate sticks"))
    expect(items()).toHaveLength(5)
    expect(screen.getByLabelText("Add a note")).toHaveValue("")
    expect(await screen.findByRole("button", { name: "Add note" })).toBeDisabled()
  })

  it("does not show a note twice once the page brings it back in its lines", async () => {
    const added: TimelineLine = { id: "n1", at: "2026-11-18T16:00:00Z", actor: "Ryan", what: "Back gate sticks", kind: "event", note: "Back gate sticks" }
    const { rerender } = render(<NotesAndHistory lines={lines} onAddNote={async () => ({ ok: true, line: added })} />)
    await userEvent.type(screen.getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(screen.getByRole("button", { name: "Add note" }))
    await waitFor(() => expect(items()).toHaveLength(5))
    rerender(<NotesAndHistory lines={[added, ...lines]} onAddNote={never} />)
    expect(items()).toHaveLength(5)
  })

  it("keeps the text and says why in the API's words under the button when the note did not go in", async () => {
    render(<NotesAndHistory lines={lines} onAddNote={async () => ({ ok: false, message: "Visit not found" })} />)
    await userEvent.type(screen.getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(screen.getByRole("button", { name: "Add note" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Visit not found")
    expect(screen.getByLabelText("Add a note")).toHaveValue("Back gate sticks")
    expect(items()).toHaveLength(4)
    expect(document.body.textContent).not.toMatch(/error|failed/i)
  })

  it("keeps the text and says it did not go through when the call itself throws", async () => {
    const onAddNote = vi.fn(async (): Promise<NoteOutcome> => {
      throw new Error("network down")
    })
    render(<NotesAndHistory lines={lines} onAddNote={onAddNote} />)
    await userEvent.type(screen.getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(screen.getByRole("button", { name: "Add note" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't go through. Try again.")
    expect(screen.getByLabelText("Add a note")).toHaveValue("Back gate sticks")
    expect(screen.getByRole("button", { name: "Add note" })).toBeEnabled()
    expect(items()).toHaveLength(4)
  })

  it("leaves no result message in the section: a note that went in is a toast and the box clears", async () => {
    render(<NotesAndHistory lines={lines} onAddNote={never} />)
    await userEvent.type(screen.getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(screen.getByRole("button", { name: "Add note" }))
    await waitFor(() => expect(screen.getByLabelText("Add a note")).toHaveValue(""))
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.queryByText("Note added")).toBeNull()
  })

  it("writes the year on a line that is not from this year, and only then", () => {
    const old: TimelineLine = { id: "e0", at: "2025-11-09T20:00:00Z", actor: "Ryan", what: "Spring turn-on marked done", kind: "event" }
    render(<NotesAndHistory lines={[...lines, old]} now={new Date("2026-11-20T12:00:00Z")} onAddNote={never} />)
    expect(items()[0]!.textContent).toBe("Nov 17 · Ryan · Spring turn-on marked done, paid by Venmo")
    expect(items().at(-1)!.textContent).toBe("Nov 9, 2025 · Ryan · Spring turn-on marked done")
    expect(lineDate("2026-12-31T23:30:00Z", new Date("2026-01-02T12:00:00Z"))).toBe("Dec 31")
    expect(lineDate("2027-01-02T12:00:00Z", new Date("2026-12-31T12:00:00Z"))).toBe("Jan 2, 2027")
  })
})
