import type { TimelineLine } from "@/lib/events/timeline"

/**
 * What an admin server action answers (`(shell)/actions.ts`): done with whatever the screen reads back, or the API's own words
 * for why not. The screens take their actions as optional props of this shape; the catalog passes none and they stay local.
 */
export type Outcome<T = undefined> = { ok: true; data: T } | { ok: false; message: string }

/** What a note can be added to (`events.note`), and the action that adds one: it answers the note as a line of the story. */
export type NoteAbout = "customer" | "property" | "job" | "visit"
export type AddNote = (about: NoteAbout, aboutId: string, text: string) => Promise<Outcome<TimelineLine>>
