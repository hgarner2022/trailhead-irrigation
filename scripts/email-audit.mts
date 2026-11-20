// Renders every live email (src/emails, made-up fixtures) to 600px and 375px screenshots plus a metrics file, so an audit can look at them.
// Usage: npx tsx scripts/email-audit.ts [outDir]   (default docs/plans/2026-11-20-email-audit). Nothing is sent. The logo and images are read from public/.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { chromium } from "playwright"
import { EMAIL_FIXTURES, EMAIL_LABELS, ORIGIN, REPORT_FIXTURE, SIGN_IN_FIXTURE } from "../src/emails/fixtures"
import { invoiceEmail } from "../src/emails/invoice"
import { renderEmail, type EmailKind } from "../src/emails/render"
import { signInEmail } from "../src/emails/sign-in"
import type { InvoiceData } from "../src/emails/types"

const out = resolve(process.argv[2] ?? "docs/plans/2026-11-20-email-audit")
mkdirSync(out, { recursive: true })
const publicDir = resolve("public")
const tmp = mkdtempSync(join(tmpdir(), "email-audit-"))

const emails: { id: string; label: string; subject: string; text: string; html: string }[] = []
for (const kind of Object.keys(EMAIL_FIXTURES) as EmailKind[]) {
  const r = renderEmail(kind, EMAIL_FIXTURES[kind])!
  emails.push({ id: kind, label: EMAIL_LABELS[kind], ...r })
}
const withReport = invoiceEmail({ ...(EMAIL_FIXTURES.invoice as unknown as InvoiceData), report: REPORT_FIXTURE })
emails.push({ id: "invoice-with-report", label: "Invoice with the visit report", ...withReport })
const signIn = signInEmail(SIGN_IN_FIXTURE)
emails.push({ id: "sign-in", label: EMAIL_LABELS["sign-in"], ...signIn })

const metrics: Record<string, unknown> = {}
const browser = await chromium.launch()
for (const e of emails) {
  const html = e.html.replaceAll(ORIGIN, `file://${publicDir}`)
  const file = join(tmp, `${e.id}.html`)
  writeFileSync(file, html)
  for (const width of [600, 375]) {
    const page = await browser.newPage({ viewport: { width: width === 600 ? 640 : 375, height: 900 }, deviceScaleFactor: 1 })
    await page.goto(`file://${file}`)
    await page.screenshot({ path: join(out, `${e.id}-${width}.png`), fullPage: true })
    await page.close()
  }
  const sizes = [...new Set([...e.html.matchAll(/font-size:(\d+)px/g)].map((m) => Number(m[1])))].sort((a, b) => a - b).filter((n) => n > 1)
  metrics[e.id] = {
    subjectLength: e.subject.length,
    htmlKb: Math.round((e.html.length / 1024) * 10) / 10,
    h1: (e.html.match(/<h1/g) ?? []).length,
    buttons: (e.html.match(/class="cta"/g) ?? []).length,
    links: (e.html.match(/<a /g) ?? []).length,
    fontSizes: sizes,
    lang: /<html lang=/.test(e.html),
    colorScheme: e.html.match(/name="color-scheme" content="([^"]+)"/)?.[1] ?? null,
    darkStyles: /prefers-color-scheme/.test(e.html),
    tabularNums: /tabular-nums/.test(e.html),
    plainTextLines: e.text.split("\n").length,
    plainTextUrls: (e.text.match(/https?:\/\//g) ?? []).length,
  }
}
await browser.close()
writeFileSync(join(out, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`)
console.log(`Wrote ${emails.length} emails to ${out}`)
