// Runs the voice rules (src/emails/messages/voice.ts) over every live email and text built from the fixtures. Usage: npx tsx scripts/voice-audit.mts
import { EMAIL_FIXTURES } from "../src/emails/fixtures"
import { voiceProblems } from "../src/emails/messages/voice"
import { renderEmail, type EmailKind } from "../src/emails/render"
import { SMS_TEMPLATES } from "../src/sms/texts"

const PASS = ["purchase-confirmation", "cancelled", "renewal", "admin-alert", "not-closed-crew"]
let n = 0
for (const kind of Object.keys(EMAIL_FIXTURES) as EmailKind[]) {
  const r = renderEmail(kind, EMAIL_FIXTURES[kind])!
  const words = `${r.subject}\n${r.text}`
  for (const p of voiceProblems({ channel: "email", words, mayNamePass: PASS.includes(kind) })) {
    console.log(`EMAIL ${kind}: ${p.rule} -> ${p.found}`)
    n++
  }
}
for (const [kind, fn] of Object.entries(SMS_TEMPLATES)) {
  const d = EMAIL_FIXTURES[(kind === "on-the-way" ? "date-set" : kind) as EmailKind] as never
  const t = (fn as (d: never, o?: unknown) => string)(d, {})
  console.log(`TEXT ${kind} (${t.length}): ${t}`)
  for (const p of voiceProblems({ channel: "text", words: t })) {
    console.log(`   PROBLEM ${kind}: ${p.rule} -> ${p.found}`)
    n++
  }
}
console.log(`${n} problems`)
