#!/usr/bin/env node
// Lists the routes and CSS the last `next build` produced, so a change to the
// app tree can prove the marketing site is unchanged. Routes come from
// .next/server/app-paths-manifest.json; CSS files from .next/static/css or,
// when Next puts them there, .next/static/chunks.
//   node scripts/route-css-manifest.mjs --save      writes .local-data/wiring/manifest.json
//   node scripts/route-css-manifest.mjs --compare   exits 1 when the build differs from it
// A CSS file is keyed by its name with the content hash stripped; when the name
// is only a hash, by the hash of its sorted selectors. Each entry also keeps its
// selector list, a hash of its whole normalised text (every top-level rule,
// sorted, so :root, body, @font-face, @property and attribute selectors count),
// and that rule list. A baseline file with no exact match in the new build is
// "missing" unless every one of its top-level rules is still, character for
// character, in some file of the new build (Next may split one stylesheet into
// chunks); extra files (the app stylesheet) are fine.
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const OUT = ".local-data/wiring/manifest.json"
// The same baseline, committed, so the proof is in git; --compare uses it when .local-data has none.
const FIXTURE = "scripts/fixtures/marketing-manifest.baseline.json"
const SKIP = /^\/(admin|account|season-pass\/checkout|developers|api)(\/|$)/

export function selectorsOf(css) {
  const found = new Set()
  for (const m of css.matchAll(/(?:^|[}{;])\s*([.#][^{}@;]+?)\s*\{/g)) found.add(m[1].trim())
  return [...found].sort()
}

/** The top-level rules of minified CSS, sorted: one entry per `x{...}` or `@x ...;` at depth 0. */
export function rulesOf(css) {
  const rules = []
  let depth = 0, start = 0
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) { rules.push(css.slice(start, i + 1).trim()); start = i + 1 }
    } else if (c === ";" && depth === 0) { rules.push(css.slice(start, i + 1).trim()); start = i + 1 }
  }
  const rest = css.slice(start).trim()
  if (rest) rules.push(rest)
  return rules.sort()
}

const hash = (t) => createHash("sha256").update(t).digest("hex").slice(0, 12)

// next/font names its class after a hash of where the font is declared, so moving the
// declaration renames `.<font>-module__<hash>__variable` without changing a single rule.
const stableFontClasses = (css) => css.replace(/(_[a-f0-9]{8})?-module__[A-Za-z0-9]{6}__/g, "-module__")

export function readManifest() {
  const paths = JSON.parse(readFileSync(".next/server/app-paths-manifest.json", "utf8"))
  const routes = Object.keys(paths)
    .filter((p) => p.endsWith("/page") || p.endsWith("/route"))
    .map((p) => p.replace(/\/(page|route)$/, "").replace(/\/\([^)]+\)/g, "") || "/")
    .filter((r) => !SKIP.test(r))
    .sort()
  const css = {}
  const dir = [".next/static/css", ".next/static/chunks"].find((d) => existsSync(d) && readdirSync(d).some((n) => n.endsWith(".css")))
  for (const name of dir ? readdirSync(dir).filter((n) => n.endsWith(".css")).sort() : []) {
    const text = stableFontClasses(readFileSync(join(dir, name), "utf8"))
    const selectors = hash(selectorsOf(text).join("\n"))
    const rules = rulesOf(text)
    const stripped = name.replace(/\.?[a-f0-9]{8,}\.css$/, "")
    css[stripped ? `${stripped}.css` : `${selectors}.css`] = { bytes: text.length, selectors, text: hash(rules.join("\n")), list: selectorsOf(text), rules }
  }
  return { routes, css }
}

export function diffManifests(before, after) {
  const out = []
  for (const r of before.routes) if (!after.routes.includes(r)) out.push(`route missing: ${r}`)
  for (const r of after.routes) if (!before.routes.includes(r)) out.push(`route added: ${r}`)
  const union = new Set(Object.values(after.css).flatMap((f) => f.rules ?? []))
  for (const [name, b] of Object.entries(before.css)) {
    const a = after.css[name]
    if (a && a.selectors === b.selectors && a.bytes === b.bytes && (!b.text || a.text === b.text)) continue
    if (b.rules && b.rules.every((x) => union.has(x))) continue
    if (!a) out.push(`css missing: ${name}`)
    else out.push(`css changed: ${name} (selectors ${b.selectors} -> ${a.selectors}, ${b.bytes} -> ${a.bytes} bytes)`)
  }
  return out
}

if (process.argv[1]?.endsWith("route-css-manifest.mjs")) {
  const current = readManifest()
  if (process.argv.includes("--save")) {
    mkdirSync(".local-data/wiring", { recursive: true })
    writeFileSync(OUT, JSON.stringify(current, null, 2))
    console.log(`saved ${current.routes.length} routes and ${Object.keys(current.css).length} css files to ${OUT}`)
  } else {
    const saved = JSON.parse(readFileSync(existsSync(OUT) ? OUT : FIXTURE, "utf8"))
    const problems = diffManifests(saved, current)
    for (const p of problems) console.log(p)
    if (problems.length) process.exit(1)
    console.log("marketing routes and css unchanged")
  }
}
