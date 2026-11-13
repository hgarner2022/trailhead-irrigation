#!/usr/bin/env node
// Design gate. Enforces "The rule" in docs/DESIGN.md for the app surfaces. Each
// rule lives in scripts/design-gate/ (its header says what it checks):
//   colours.mjs        tokens only in blocks/, the app route groups and ui/; src/emails and src/sms too, except the one hex block in emails/layout.ts
//   stories.mjs        a story per ui/ and blocks/ component
//   imports.mjs        no admin and marketing cross-imports; no server libraries in marketing code
//   marketing-css.mjs  marketing CSS scans exactly the ui/ primitives marketing uses
//   file-size.mjs      300-line cap in blocks/, ui/ and the app route groups
// Other marketing checks are not run.
// Usage: node scripts/check-design.mjs [--dir src]
import { readFileSync } from "node:fs"
import { walk, describe } from "./design-gate/walk.mjs"
import { allowEmailColourBlock, checkColours, checkEmailColours, LEGACY } from "./design-gate/colours.mjs"
import { checkImports, checkServerImports } from "./design-gate/imports.mjs"
import { checkStory } from "./design-gate/stories.mjs"
import { loadExcludedUi, MarketingCss } from "./design-gate/marketing-css.mjs"
import { checkFileSize } from "./design-gate/file-size.mjs"

const argv = process.argv.slice(2)
const root = argv.includes("--dir") ? argv[argv.indexOf("--dir") + 1] : "src"

const report = { problems: [], notes: [] }
const excludedUi = loadExcludedUi(root, report)
const marketingCss = excludedUi && new MarketingCss(excludedUi)

for (const abs of walk(root)) {
  const info = describe(root, abs)
  const { file, name, fixture, zone, marketing, gated } = info
  if (!zone && !marketing && !gated) continue
  let text
  try {
    text = readFileSync(abs, "utf8")
  } catch {
    report.problems.push(`${file}: cannot read`)
    continue
  }
  checkFileSize(text, info, report)
  if (marketing) checkServerImports(file, text, report)
  if (marketingCss && marketing) marketingCss.checkMarketingImports(file, text, report)
  if (marketingCss && zone === "ui" && !fixture && name.endsWith(".tsx")) marketingCss.recordUi(name.slice(0, -4), text)
  if (!zone) continue
  if (zone === "emails") text = allowEmailColourBlock(file, text, report)
  if (zone === "emails" && !fixture) checkEmailColours(file, text, report)
  else if (zone !== "marketing" && !fixture) checkColours(file, text, zone === "ui" && LEGACY.has(name), report)
  if (zone !== "ui") checkImports(file, text, zone, report)
  checkStory(abs, info, report)
}
if (marketingCss) marketingCss.checkCoverage(report)

for (const n of report.notes) console.log(n)
if (report.problems.length) {
  for (const p of report.problems) console.log(p)
  process.exit(1)
}
console.log("design gates: ok")
