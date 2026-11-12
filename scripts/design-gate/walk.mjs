// Walks the source tree and names the zone each file belongs to.
import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, join, relative, sep } from "node:path"

// Every .ts/.tsx file under dir, symlinks skipped.
export function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) walk(file, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(file)
  }
  return out
}

export const appGroupRe = /^\((?:admin|checkout|account)\)$/

// Folders match by path segment, so "(admin)" and "blocks" only match as
// directory names. zone: "app" (blocks/ and the (admin), (checkout) and
// (account) route groups), "ui", "marketing" (sections/) or null. marketing: a page or section .tsx the marketing CSS is
// built from. gated: inside a folder the file cap applies to.
export function describe(root, abs) {
  const dirs = relative(root, dirname(abs)).split(sep)
  const name = basename(abs)
  const fixture = /\.(stories|test)\.tsx?$/.test(name)
  const zone = dirs.includes("blocks") || dirs.some((d) => appGroupRe.test(d)) ? "app"
    : dirs.includes("ui") ? "ui"
    : dirs.includes("sections") ? "marketing"
    : null
  const marketing = !fixture && name.endsWith(".tsx") &&
    (zone === "marketing" || (dirs[0] === "app" && !dirs.some((d) => appGroupRe.test(d))))
  const gated = dirs.includes("blocks") || dirs.includes("ui") || dirs.some((d) => appGroupRe.test(d))
  return { file: relative(process.cwd(), abs), dirs, name, fixture, zone, marketing, gated }
}

export const importRe = /\bfrom\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']/g

export function importSpecs(text) {
  return [...text.matchAll(importRe)].map((m) => m[1] ?? m[2])
}
