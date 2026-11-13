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
/** The same, returning Resend's id so `message_log` can keep it. */
export type LoggedEmailSender = (message: OutgoingEmail) => Promise<{ id: string | null }>

export const FROM = "Trailhead <contact@trailheadirrigation.com>"

/** Sends one email through Resend with the shared `RESEND_API_KEY` and returns its id. Tests pass their own sender and never reach Resend. */
export const sendEmailLogged: LoggedEmailSender = async (message) => {
  const { RESEND_API_KEY } = readEnv(["RESEND_API_KEY"])
  const { data, error } = await new Resend(RESEND_API_KEY).emails.send({ from: FROM, ...message })
  if (error) throw new Error(`Resend failed: ${error.message}`)
  return { id: data?.id ?? null }
}

export const sendEmailNow: EmailSender = async (message) => {
  await sendEmailLogged(message)
}
