// The generic email for a text with no email twin of its own (on my way, the office's free text). Used while texts are paused:
// the text's own words are the email's one paragraph and its first sentence is the subject, so nothing is dropped.
import { SIGN_OFF } from "./format"
import { emailLayout, greetingText, paragraph, plainText } from "./layout"
import type { RenderedEmail } from "./types"

export interface PlainData {
  origin: string
  firstName: string
  /** the text exactly as it would have gone, "Trailhead: ..." and all, without the opt-out line */
  plainBody: string
}

const WHY = "You are getting this by email because Trailhead's texts are on hold while our number is registered with the carriers."

/** The first sentence of a text without its "Trailhead:" opening, for a subject line (80 characters at most). */
export function subjectOf(body: string): string {
  const words = body.replace(/^\s*Trailhead:\s*/i, "").replace(/\s+/g, " ").trim()
  const first = words.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? words
  const bare = first.replace(/[.!?]+$/, "")
  return (bare.length > 80 ? `${bare.slice(0, 77).trimEnd()}...` : bare) || "A message from Trailhead"
}

export function plainEmail(d: PlainData): RenderedEmail {
  const words = d.plainBody.trim()
  const subject = subjectOf(words)
  return {
    subject,
    text: plainText([...greetingText(d.firstName), words], SIGN_OFF, WHY),
    html: emailLayout({ origin: d.origin, preheader: subject, title: subject, greet: { firstName: d.firstName }, body: paragraph(words), why: WHY, signOff: SIGN_OFF }),
  }
}
