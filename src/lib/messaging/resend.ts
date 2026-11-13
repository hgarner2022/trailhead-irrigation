import "server-only"
import { Resend } from "resend"
import { readEnv } from "@/lib/env"

export interface OutgoingEmail {
  to: string
  subject: string
  text: string
  html?: string
}

export type EmailSender = (message: OutgoingEmail) => Promise<void>

const FROM = "Trailhead <contact@trailheadirrigation.com>"

/**
 * Sends one email now through Resend with the shared `RESEND_API_KEY`.
 * Phase 12 replaces this with the queued, logged sender; callers keep the
 * same shape. Tests pass their own `EmailSender` and never reach Resend.
 */
export const sendEmailNow: EmailSender = async (message) => {
  const { RESEND_API_KEY } = readEnv(["RESEND_API_KEY"])
  const { error } = await new Resend(RESEND_API_KEY).emails.send({ from: FROM, ...message })
  if (error) throw new Error(`Resend failed: ${error.message}`)
}
