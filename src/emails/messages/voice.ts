// The voice rules for a customer message (docs/UX_WRITING.md "Transactional emails and texts", Hannah's booking-form rule "remove, never add"), as a checkable list.
// Pure: a message in, the rules it breaks out. Used by the tests of the proposed messages and by the audit of the live ones.

export interface VoiceInput {
  channel: "text" | "email"
  /** the words a person reads: a text's body, or an email's subject, headline and plain text */
  words: string
  /** the kind may say "Season Pass" and its number only when it is about the pass */
  mayNamePass?: boolean
  /** the word "request" is allowed: the thank-you after a request ("Thanks. We've got your request."), and the note to the office about one (Hannah, Nov 20 2026) */
  mayNameRequest?: boolean
}

export interface VoiceProblem {
  rule: string
  found: string
}

const ASCII = /^[\x20-\x7E\n]*$/

const BANNED: { rule: string; pattern: RegExp }[] = [
  { rule: "no window or span of hours (exact times only)", pattern: /\b(window|between \d{1,2}(:\d\d)? ?(and|to)|\d{1,2}(:\d\d)? ?(am|pm)? to \d{1,2}(:\d\d)? ?(am|pm))\b/i },
  { rule: 'no system words ("job", "line item", "stage", "request")', pattern: /\b(job|line item|stage|request)\b/i },
  { rule: 'say invoice, never "bill"', pattern: /\bbills?\b/i },
  { rule: 'say past due, never "overdue"', pattern: /\boverdue\b/i },
  { rule: 'say canceled, never "cancelled"', pattern: /\bcancelled\b/i },
  { rule: "no truck labels", pattern: /\btruck\b/i },
  { rule: "no response times", pattern: /\b(within|by) (\d+ )?(hours?|minutes?|tomorrow|today|end of (the )?day)\b|\bas soon as\b|\bright away\b/i },
  { rule: 'no "free", "guarantee", "in writing" or statistics the business did not decide', pattern: /\b(free of charge|for free|free quote|guarantee[ds]?|in writing|\d+%|percent)\b/i },
  { rule: "no reassurance filler", pattern: /\b(don't worry|rest assured|no worries|we promise|we guarantee)\b/i },
]

/** The rules a message breaks, with the words that broke each. Empty when it follows them. */
export function voiceProblems({ channel, words: raw, mayNamePass = false, mayNameRequest = false }: VoiceInput): VoiceProblem[] {
  // A link is not words: its token, query and percent codes are left out of every check but the ASCII one.
  const words = raw.replace(/https?:\/\/\S+/g, "LINK")
  const out: VoiceProblem[] = []
  const hit = (rule: string, found: string) => out.push({ rule, found })
  if (words.includes("—")) hit("no em dashes", "—")
  if (words.includes("!")) hit("no exclamation marks", "!")
  for (const { rule, pattern } of BANNED) {
    // "request" is only a system word where it is not the customer's own
    const m = (mayNameRequest && pattern.source.includes("line item") ? words.replace(/\brequest(s|ed)?\b/gi, "") : words).match(pattern)
    if (m) hit(rule, m[0])
  }
  if (!mayNamePass && /\bseason pass\b|\bpass (number|TH-)/i.test(words)) hit('"Season Pass" only on the pass messages', "Season Pass")
  if (channel === "text") {
    if (!words.startsWith("Trailhead:")) hit('a text opens "Trailhead:"', words.slice(0, 20))
    if (!ASCII.test(raw)) hit("a text is plain ASCII", words.replace(/[\x20-\x7E\n]/g, "").slice(0, 8))
    if ((words.match(/\?/g) ?? []).length > 1) hit("a text asks at most once", "?")
    if (/\bReply STOP to opt out\.\s*\S/.test(words)) hit('"Reply STOP to opt out." ends the text', "STOP")
  }
  return out
}

/** A text's words with the opt-out line left off, for a text that is not the first one a number gets. */
export const OPT_OUT_LINE = "Reply STOP to opt out."
