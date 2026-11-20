// Renders the PROPOSED layout of every message that has an email (src/emails/design, the Messages catalog) at 600px and 375px, light and dark, for a look at it outside Storybook.
// Usage: npx tsx scripts/email-proposed.mts [outDir]   (default docs/plans/2026-11-20-email-audit/proposed). Nothing is sent.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { chromium } from "playwright"
import { MESSAGES } from "../src/emails/messages/catalog"
import { ORIGIN } from "../src/emails/messages/fixtures"

const out = resolve(process.argv[2] || "docs/plans/2026-11-20-email-audit/proposed")
mkdirSync(out, { recursive: true })
const publicDir = resolve("public")
const tmp = mkdtempSync(join(tmpdir(), "email-proposed-"))
const only = process.argv.slice(3)

const browser = await chromium.launch()
for (const m of MESSAGES.filter((x) => x.proposed && (only.length === 0 || only.includes(x.id)))) {
  const email = m.proposed!()
  for (const scheme of ["light", "dark"] as const) {
    const html = email.html.replaceAll(ORIGIN, `file://${publicDir}`)
    const file = join(tmp, `${m.id}-${scheme}.html`)
    writeFileSync(file, html)
    for (const width of [600, 375]) {
      if (scheme === "dark" && width === 375 && only.length === 0 && !["receipt-card", "invoice", "date-set"].includes(m.id)) continue
      const page = await browser.newPage({ viewport: { width: width === 600 ? 640 : 375, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme })
      await page.goto(`file://${file}`)
      await page.screenshot({ path: join(out, `${m.id}-${width}${scheme === "dark" ? "-dark" : ""}.png`), fullPage: true })
      await page.close()
    }
  }
}
await browser.close()
console.log(`Wrote the proposed emails to ${out}`)
