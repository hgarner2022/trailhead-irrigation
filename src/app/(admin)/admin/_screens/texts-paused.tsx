"use client"

import { createContext, useContext } from "react"

// Whether the office has paused texts (`TEXTS_PAUSED`, read on the server into `AdminData.textsPaused`): the record host provides it so a dialog
// that sends a text can say it goes by email instead, without every footer passing it down.

const TextsPausedContext = createContext(false)

export const TextsPausedProvider = TextsPausedContext.Provider
export const useTextsPaused = () => useContext(TextsPausedContext)

/** What the Send a text dialog says while texts are paused: where it goes, or why it cannot. */
export function pausedLine(client: { email?: string } | undefined): string {
  return client?.email ? `Texts are paused. This goes by email to ${client.email}.` : "Texts are paused and this customer has no email."
}
