import type { TimingPreference } from "@/lib/admin/types"
import type { AddNote, Outcome } from "./action-types"

/** The panel's and the bulk buttons; server actions in the app. Without them the buttons only log, as in the catalog. */
export interface PassesActions {
  resendConfirmation: (passId: string) => Promise<Outcome>
  sendCardUpdateLink: (passId: string) => Promise<Outcome>
  cancel: (passId: string) => Promise<Outcome>
  addInspection: (passId: string) => Promise<Outcome>
  changePreference: (passId: string, kind: "turn-on" | "blowout", preference: TimingPreference) => Promise<Outcome>
  skip: (passId: string, kind: "turn-on" | "inspection" | "blowout") => Promise<Outcome>
  /** `events.note` on the pass's job, from the Notes and history block; a tech may add one */
  addNote: AddNote
}
