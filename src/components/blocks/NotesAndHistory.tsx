"use client"

import { useId, useState, useTransition, type FormEvent } from "react"
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

export interface NotesAndHistoryProps {
  /** the story, newest first */
  lines: TimelineLine[]
  onAddNote: (text: string) => Promise<NoteOutcome>
  className?: string
}

const kindOf = (line: TimelineLine) => (line.kind === "message" ? "message" : line.note !== undefined ? "note" : "event")

function Line({ line }: { line: TimelineLine }) {
  const kind = kindOf(line)
  return (
    <li data-kind={kind} className={cn("py-2.5 text-sm", kind === "note" && "border-l-2 border-primary pl-3", kind === "message" && "text-muted-foreground")}>
      <span className="text-muted-foreground">
        <time dateTime={line.at}>{shortDate(line.at, TIME_ZONE)}</time>
        {` · ${line.actor} · `}
      </span>
      <span data-slot={kind === "note" ? "note-text" : undefined} className={cn("break-words", kind === "note" && "whitespace-pre-wrap font-medium")}>
        {line.note ?? line.what}
      </span>
    </li>
  )
}

export function NotesAndHistory({ lines, onAddNote, className }: NotesAndHistoryProps) {
  const id = useId()
  const [text, setText] = useState("")
  const [problem, setProblem] = useState("")
  const [added, setAdded] = useState<TimelineLine[]>([])
  const [pending, start] = useTransition()
  // A note just added shows at the top until the page brings it back in `lines`.
  const shown = [...added.filter((a) => !lines.some((l) => l.id === a.id)), ...lines]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const note = text.trim()
    if (!note || pending) return
    setProblem("")
    start(async () => {
      const out = await onAddNote(note)
      if (out.ok) {
        setText("")
        if (out.line) setAdded((rows) => [out.line!, ...rows])
      } else setProblem(out.message)
    })
  }

  return (
    <section aria-labelledby={`${id}-heading`} data-slot="notes-and-history" className={className}>
      <h3 id={`${id}-heading`} className="font-display text-lg leading-tight text-navy">
        Notes and history
      </h3>
      <form onSubmit={submit} className="mt-2">
        <label htmlFor={`${id}-note`} className="mb-1 block text-sm font-medium text-foreground">
          Add a note
        </label>
        <Textarea id={`${id}-note`} value={text} maxLength={NOTE_MAX} rows={3} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" variant="outline" className="mt-2 min-h-11" disabled={pending || !text.trim()}>
          {pending ? "Adding" : "Add note"}
        </Button>
        <p role="alert" className="mt-1 text-sm text-destructive empty:hidden">
          {problem}
        </p>
      </form>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No notes or history yet. Add a note and it shows here.</p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {shown.map((line) => (
            <Line key={line.id} line={line} />
          ))}
        </ol>
      )}
    </section>
  )
}
