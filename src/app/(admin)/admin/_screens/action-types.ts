import type { TimelineLine } from "@/lib/events/timeline"
import type { PhotoItem } from "@/lib/photos/types"

/**
 * What an admin server action answers (`(shell)/actions.ts`): done with whatever the screen reads back, or the API's own words
 * for why not. The screens take their actions as optional props of this shape; the catalog passes none and they stay local.
 */
export type Outcome<T = undefined> = { ok: true; data: T } | { ok: false; message: string }

/**
 * What the Photos block can do (`(shell)/photo-actions.ts`): `add` records a photo whose file the browser already sent to the store
 * (`photos.add`), `show` turns "Show to customer" on or off (`photos.update`), `remove` is a soft delete (`photos.remove`). A tech may add and
 * remove their own on a visit they had; showing is a manager's.
 */
export interface PhotoActions {
  add: (visitId: string, blobKey: string) => Promise<Outcome<PhotoItem>>
  show: (photoId: string, shown: boolean) => Promise<Outcome<PhotoItem>>
  remove: (photoId: string) => Promise<Outcome>
}

/** What a note can be added to (`events.note`), and the action that adds one: it answers the note as a line of the story. */
export type NoteAbout = "customer" | "property" | "job" | "visit"
export type AddNote = (about: NoteAbout, aboutId: string, text: string) => Promise<Outcome<TimelineLine>>
