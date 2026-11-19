"use client"

import { useId, useState, useTransition, type FormEvent } from "react"
import { FormRow } from "./FormRow"
import { SectionHeading } from "./SectionHeading"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import type { TimelineLine } from "@/lib/events/timeline"
import { cn } from "@/lib/utils"

// Notes and history: one box to add a note and, under it, the story of a customer, a job or a visit in one list, newest first. A
// line reads "Nov 17 · Ryan · Spring turn-on marked done, paid by Venmo"; a note shows its text in full, wrapped, with its line
// breaks; a message ("Text sent: day-before reminder") is the quieter line and never shows its body. A tech sees the list and
// has the add box too. Staff only: nothing here ever reaches the customer. The block takes lines and `onAddNote` and knows
// nothing of the API; client component for the form.

/** What adding a note answers: the note as a line of the story (shown at the top at once), or the API's words for why not. */
export type NoteOutcome = { ok: true; line?: TimelineLine } | { ok: false; message: string }

export const NOTE_MAX = 2000

/** The words under the button when the call itself throws (a dropped connection, a server that did not answer). */
export const NOTE_PROBLEM = "That didn't go through. Try again."

/** "Nov 9", and "Nov 9, 2026" only when the line is not from this year, so an old record never reads as this year's. */
export function lineDate(at: string, now: Date = new Date()): string {
  const yearOf = (d: Date) => new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: TIME_ZONE }).format(d)
  const year = yearOf(new Date(at))
  return year === yearOf(now) ? shortDate(at, TIME_ZONE) : `${shortDate(at, TIME_ZONE)}, ${year}`
}

export interface NotesAndHistoryProps {
  /** the story, newest first */
  lines: TimelineLine[]
  onAddNote: (text: string) => Promise<NoteOutcome>
  /** today, for the year on an older line; the clock when left out */
  now?: Date
  /** inside a `SectionCard` that already carries the title: draw no heading of its own */
  bare?: boolean
  className?: string
}

const kindOf = (line: TimelineLine) => (line.kind === "message" ? "message" : line.note !== undefined ? "note" : "event")

function Line({ line, now }: { line: TimelineLine; now?: Date }) {
  const kind = kindOf(line)
  return (
    <li data-kind={kind} className={cn("py-2.5 text-sm", kind === "note" && "border-l-2 border-primary pl-3", kind === "message" && "text-muted-foreground")}>
      <span className="text-muted-foreground">
        <time dateTime={line.at}>{lineDate(line.at, now)}</time>
        {` · ${line.actor} · `}
      </span>
      <span data-slot={kind === "note" ? "note-text" : undefined} className={cn("break-words", kind === "note" && "whitespace-pre-wrap font-medium")}>
        {line.note ?? line.what}
      </span>
    </li>
  )
}

export function NotesAndHistory({ lines, onAddNote, now, bare, className }: NotesAndHistoryProps) {
  const id = useId()
  const [text, setText] = useState("")
  const [problem, setProblem] = useState("")
  const [notice, setNotice] = useState("")
  const [added, setAdded] = useState<TimelineLine[]>([])
  const [pending, start] = useTransition()
  // A note just added shows at the top until the page brings it back in `lines`.
  const shown = [...added.filter((a) => !lines.some((l) => l.id === a.id)), ...lines]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const note = text.trim()
    if (!note || pending) return
    setProblem("")
    setNotice("")
    start(async () => {
      try {
        const out = await onAddNote(note)
        if (out.ok) {
          setText("")
          setNotice("Note added")
          if (out.line) setAdded((rows) => [out.line!, ...rows])
        } else setProblem(out.message)
      } catch {
        // the typed text stays, so nothing a person wrote is lost to a dropped call
        setProblem(NOTE_PROBLEM)
      }
    })
  }

  return (
    <section aria-labelledby={bare ? undefined : `${id}-heading`} data-slot="notes-and-history" className={className}>
      {!bare && <SectionHeading id={`${id}-heading`}>Notes and history</SectionHeading>}
      <form onSubmit={submit} className={bare ? undefined : "mt-2"}>
        <FormRow label="Add a note">
          <Textarea value={text} maxLength={NOTE_MAX} rows={3} onChange={(e) => { setText(e.target.value); setNotice("") }} />
        </FormRow>
        <Button type="submit" variant="outline" className="mt-2 min-h-11" disabled={pending || !text.trim()}>
          {pending ? "Adding" : "Add note"}
        </Button>
        <p role="alert" className="mt-1 text-sm text-destructive empty:hidden">
          {problem}
        </p>
        <p role="status" className="mt-1 text-sm text-muted-foreground empty:hidden">
          {notice}
        </p>
      </form>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No notes or history yet. Add a note and it shows here.</p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {shown.map((line) => (
            <Line key={line.id} line={line} now={now} />
          ))}
        </ol>
      )}
    </section>
  )
}
