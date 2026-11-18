// The sign-in email on the shared layout: the link, the host and who it is for in, the subject, the text and the HTML out.
// No greeting: the sign-in is asked for with an email address and the route never knows a name.
import { SIGN_OFF } from "./format"
import { button, emailLayout, paragraph, plainText, smallPrint } from "./layout"
import type { RenderedEmail } from "./types"

export interface SignInEmailInput {
  url: string
  /** the site's host, shown so people can see where the link goes */
  host: string
}

export type SignInEmail = RenderedEmail

const WHY = "You are getting this because someone asked to sign in to Trailhead with this email address."

export function signInEmail({ url, host }: SignInEmailInput): SignInEmail {
  const origin = new URL(url).origin
  const lead = `Use this link to sign in to Trailhead at ${host}.`
  const body = button(url, "Sign in") + paragraph("The link works one time and expires in 10 minutes.") + paragraph("If you didn't ask for it, ignore this email. Your account stays as it is.") + smallPrint(`If the button doesn't work, paste this link into your browser: ${url}`)
  return {
    subject: "Your Trailhead sign-in link",
    text: plainText([`Use this link to sign in to Trailhead at ${host}:`, url, "", "The link works one time and expires in 10 minutes.", "", "If you didn't ask for it, ignore this email. Your account stays as it is."], SIGN_OFF, WHY),
    html: emailLayout({ origin, preheader: "Your sign-in link works once and for ten minutes.", title: "Sign in to Trailhead", lead, body, why: WHY, signOff: SIGN_OFF }),
  }
}
