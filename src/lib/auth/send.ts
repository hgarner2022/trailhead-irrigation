import "server-only"
import { signInEmail } from "@/emails/sign-in"
import { confirmLinkFor } from "./confirm-link"
import { sendEmailNow, type EmailSender } from "@/lib/messaging/resend"

/** Auth.js's `sendVerificationRequest`, with the sender injectable so tests never send. */
export function makeSendVerificationRequest(send: EmailSender = sendEmailNow) {
  return async ({ identifier, url }: { identifier: string; url: string }) => {
    const { host } = new URL(url)
    // The email links to the confirm page, not the callback, so a mail scanner cannot spend the one-time token.
    await send({ to: identifier, ...signInEmail({ url: confirmLinkFor(url), host }) })
  }
}
