import "server-only"
import { signInEmail } from "@/emails/sign-in"
import { sendEmailNow, type EmailSender } from "@/lib/messaging/resend"

/** Auth.js's `sendVerificationRequest`, with the sender injectable so tests never send. */
export function makeSendVerificationRequest(send: EmailSender = sendEmailNow) {
  return async ({ identifier, url }: { identifier: string; url: string }) => {
    const { host } = new URL(url)
    await send({ to: identifier, ...signInEmail({ url, host }) })
  }
}
