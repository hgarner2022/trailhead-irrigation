// The sign-in email on the shared layout: the link, the host and who it is for in, the subject, the text and the HTML out.
import { BUSINESS } from "./format"
import { button, emailLayout, heading, paragraph, plainText } from "./layout"
import type { RenderedEmail } from "./types"

export interface SignInEmailInput {
  url: string
  /** the site's host, shown so people can see where the link goes */
  host: string
}

export type SignInEmail = RenderedEmail

export function signInEmail({ url, host }: SignInEmailInput): SignInEmail {
  const origin = new URL(url).origin
  const body = heading("Sign in to Trailhead") + paragraph(`Use this link to sign in to Trailhead at ${host}.`) + button(url, "Sign in") + paragraph("The link works one time and expires in 10 minutes.") + paragraph("If you didn't ask for it, ignore this email. Your account stays as it is.")
  return {
    subject: "Your Trailhead sign-in link",
    text: plainText(["Hi,", "", `Use this link to sign in to Trailhead at ${host}:`, url, "", "The link works one time and expires in 10 minutes.", "", "If you didn't ask for it, ignore this email. Your account stays as it is."]),
    html: emailLayout({ origin, preheader: "Your sign-in link works once and for ten minutes.", body, reason: `Questions: ${BUSINESS.phone}` }),
  }
}
