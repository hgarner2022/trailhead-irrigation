#!/usr/bin/env node
// Design gate. Enforces "The rule" in docs/DESIGN.md for the app surfaces:
//   - blocks/, (admin)/ and ui/: tokens only (no hex, rgb(), hsl(), arbitrary
//     colour utilities or Tailwind palette colours on a colour-bearing prefix);
//     ui/ files in LEGACY are reported, not failed, until they are migrated
//   - every ui/ and blocks/ component has a sibling *.stories.tsx
//   - blocks/ and (admin)/ never import marketing sections; sections/ never
//     imports blocks/ or (admin)/
// Marketing code outside those folders is not checked. Folders match by path
// segment, so "(admin)" and "blocks" only match as directory names.
// Usage: node scripts/check-design.mjs [--dir src]
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename, dirname, join, relative, sep } from "node:path"

const argv = process.argv.slice(2)
const root = argv.includes("--dir") ? argv[argv.indexOf("--dir") + 1] : "src"

// ui/ files that predate DESIGN.md and still use palette colours for error
// states. Remove a file here when it is migrated to tokens.
const LEGACY = new Set(["input.tsx", "textarea.tsx"])

const PREFIX = "bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|decoration|accent|caret|placeholder"
const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone"
const paletteRe = new RegExp(`\\b(?:${PREFIX})-(?:${PALETTE})-(?:50|[1-9]00|950)\\b`, "g")
// A hex only counts where a colour value sits: after a quote, space, "[" or ":".
const rawRe = new RegExp(
  `(?<=["'\\s\\[:])#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|\\b(?:${PREFIX})-\\[(?:#|rgba?\\(|hsla?\\(|color:|var\\(--color)[^\\]]*\\]`,
  "g",
)
const contextRe = /className=|\bclass=|\bstyle=|\bfill=|\bstroke=|\bstopColor=|\bcolor=|\bcn\(|\bcva\(/
// Attributes whose values look like hex but never are colours (href="#add").
const anchorAttrRe = /\b(?:href|id|htmlFor|aria-[\w-]+)=(?:"[^"]*"|'[^']*'|\{[^}]*\})/g
// Strings, block comments and line comments, removed before counting brackets.
const bare = (line) =>
  line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "$1$1").replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "")
const importRe = /\bfrom\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']/g

const problems = []
const notes = []

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) walk(file, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(file)
  }
  return out
}

// Lines that sit inside a className= / style= / fill= / cn( / cva( context,
// tracked across lines by bracket depth so multi-line cn() calls are covered.
// Brackets are counted on the bare line (no strings or comments), and a line
// that opens a new className= with balanced quotes resets the depth.
function colourContextLines(text) {
  const lines = []
  let depth = 0
  text.split("\n").forEach((line, i) => {
    const code = bare(line)
    const m = contextRe.exec(code)
    if (m && /className=/.test(code) && (code.match(/["'`]/g) || []).length % 2 === 0) depth = 0
    if (depth === 0 && !m) return
    const fresh = depth === 0 // this line opens the context, so scan from the opener
    for (const ch of code.slice(fresh ? m.index : 0)) {
      if (ch === "(" || ch === "{") depth++
      else if (ch === ")" || ch === "}") depth = Math.max(0, depth - 1)
    }
    lines.push([i + 1, fresh ? line.slice(contextRe.exec(line)?.index ?? 0) : line])
  })
  return lines
}

function checkColours(file, text, legacy) {
  const found = []
  for (const [n, part] of colourContextLines(text)) {
    for (const m of part.replace(anchorAttrRe, "").matchAll(rawRe)) found.push(`line ${n}: raw colour "${m[0]}"`)
  }
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(paletteRe)) found.push(`line ${i + 1}: palette colour "${m[0]}"`)
  })
  if (!found.length) return
  if (legacy) notes.push(`${file}: legacy, migrate when touched (${found.join("; ")})`)
  else for (const f of found) problems.push(`${file}: ${f} (use a token from globals.css)`)
}

function checkImports(file, text, zone) {
  for (const m of text.matchAll(importRe)) {
    const spec = m[1] ?? m[2]
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue
    const segs = spec.split("/")
    if (zone === "app" && segs.includes("sections")) problems.push(`${file}: imports a marketing section (${spec})`)
    if (zone === "marketing" && (segs.includes("blocks") || segs.includes("(admin)")))
      problems.push(`${file}: marketing code imports admin code (${spec})`)
  }
}

for (const abs of walk(root)) {
  const dirs = relative(root, dirname(abs)).split(sep)
  const zone = dirs.includes("blocks") || dirs.includes("(admin)") ? "app"
    : dirs.includes("ui") ? "ui"
    : dirs.includes("sections") ? "marketing"
    : null
  if (!zone) continue
  const file = relative(process.cwd(), abs)
  const name = basename(abs)
  const fixture = /\.(stories|test)\.tsx?$/.test(name)
  let text
  try {
    text = readFileSync(abs, "utf8")
  } catch {
    problems.push(`${file}: cannot read`)
    continue
  }
  if (zone !== "marketing" && !fixture) checkColours(file, text, zone === "ui" && LEGACY.has(name))
  if (zone !== "ui") checkImports(file, text, zone)
  const needsStory = (dirs.includes("blocks") || zone === "ui") && name.endsWith(".tsx") && !fixture
  if (needsStory && !existsSync(abs.replace(/\.tsx$/, ".stories.tsx"))) problems.push(`${file}: no story`)
}

for (const n of notes) console.log(n)
if (problems.length) {
  for (const p of problems) console.log(p)
  process.exit(1)
}
console.log("design gates: ok")
