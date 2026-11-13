#!/usr/bin/env node
// Lists the routes and CSS the last `next build` produced, so a change to the
// app tree can prove the marketing site is unchanged. Routes come from
// .next/server/app-paths-manifest.json; CSS files from .next/static/css or,
// when Next puts them there, .next/static/chunks.
//   node scripts/route-css-manifest.mjs --save      writes .local-data/wiring/manifest.json
//   node scripts/route-css-manifest.mjs --compare   exits 1 when the build differs from it
// A CSS file is keyed by its name with the content hash stripped; when the name
// is only a hash, by the hash of its sorted selectors. A baseline file with no
// match in the new build is "missing"; extra files (the app stylesheet) are fine.
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const OUT = ".local-data/wiring/manifest.json"
const SKIP = /^\/(admin|account|season-pass\/checkout|developers|api)(\/|$)/

export function selectorsOf(css) {
  const found = new Set()
  for (const m of css.matchAll(/(?:^|[}{;])\s*([.#][^{}@;]+?)\s*\{/g)) found.add(m[1].trim())
  return [...found].sort()
}

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
    const text = readFileSync(join(dir, name), "utf8")
    const selectors = createHash("sha256").update(selectorsOf(text).join("\n")).digest("hex").slice(0, 12)
    const stripped = name.replace(/\.?[a-f0-9]{8,}\.css$/, "")
    css[stripped ? `${stripped}.css` : `${selectors}.css`] = { bytes: text.length, selectors }
  }
  return { routes, css }
}

export function diffManifests(before, after) {
  const out = []
  for (const r of before.routes) if (!after.routes.includes(r)) out.push(`route missing: ${r}`)
  for (const r of after.routes) if (!before.routes.includes(r)) out.push(`route added: ${r}`)
  for (const [name, b] of Object.entries(before.css)) {
    const a = after.css[name]
    if (!a) out.push(`css missing: ${name}`)
    else if (a.selectors !== b.selectors || a.bytes !== b.bytes)
      out.push(`css changed: ${name} (selectors ${b.selectors} -> ${a.selectors}, ${b.bytes} -> ${a.bytes} bytes)`)
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
    const saved = JSON.parse(readFileSync(OUT, "utf8"))
    const problems = diffManifests(saved, current)
    for (const p of problems) console.log(p)
    if (problems.length) process.exit(1)
    console.log("marketing routes and css unchanged")
  }
}
