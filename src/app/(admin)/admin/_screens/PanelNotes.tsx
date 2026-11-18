"use client"

import { NotesAndHistory, type NoteOutcome } from "@/components/blocks/NotesAndHistory"
import type { TimelineLine } from "@/lib/events/timeline"
import type { AddNote, NoteAbout } from "./action-types"

// The Notes and history block as the three panels use it: the story of one customer, job or visit and an Add note that runs the
// panel's `addNote` action. Nothing when the data carries no story (the Jobber mirror's clients and visits, the catalog's
// fixtures), since there is no record to attach a note to. A tech sees it too and can add a note. Without actions (the catalog)
// Add note only logs. Keyed by the record, so a note being typed never follows the reader to another panel.

export function PanelNotes({ about, aboutId, timeline, addNote }: { about: NoteAbout; aboutId: string; timeline: TimelineLine[] | undefined; addNote?: AddNote }) {
  if (!timeline) return null
  const onAddNote = async (text: string): Promise<NoteOutcome> => {
    if (!addNote) {
      console.info("add note", about, aboutId, text)
      return { ok: true }
    }
    const out = await addNote(about, aboutId, text)
    return out.ok ? { ok: true, line: out.data } : out
  }
  return <NotesAndHistory key={`${about}-${aboutId}`} lines={timeline} onAddNote={onAddNote} />
}
