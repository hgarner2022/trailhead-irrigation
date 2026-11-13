// The marketing CSS scans only the ui/ primitives marketing uses; the rest are
// kept out by `@source not "../components/ui/<name>.tsx"` lines in
// app/globals.css. Three checks, all skipped when that file is absent:
//   - a marketing file (app/ outside the (admin), (checkout), (account) and (booking)
//     groups, and sections/) never imports an excluded primitive
//   - every ui/ primitive is either used by marketing, directly or through
//     another primitive's `from "./<other>"` import, or excluded; and a used
//     primitive never imports an excluded one (its classes would be missing)
//   - every `@source not` line under components/ui names one file
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { importSpecs } from "./walk.mjs"

const GLOBALS = "src/app/globals.css"
const sourceNotRe = /@source\s+not\s+["']([^"']+)["']/g
const uiFileRe = /^\.\.\/components\/ui\/([\w-]+)\.tsx$/
const uiSpecRe = /^(?:@\/components\/ui|\.)\/([\w-]+)$/

// The set of ui/ primitives globals.css keeps out of the marketing CSS, or
// null when the tree has no globals.css. Malformed lines are reported.
export function loadExcludedUi(root, { problems }) {
  const globals = join(root, "app", "globals.css")
  if (!existsSync(globals)) return null
  const excluded = new Set()
  for (const [, path] of readFileSync(globals, "utf8").matchAll(sourceNotRe)) {
    const name = uiFileRe.exec(path)?.[1]
    if (name) excluded.add(name)
    else if (path.includes("components/ui"))
      problems.push(`${GLOBALS}: @source not "${path}" is not of the form "../components/ui/<name>.tsx"`)
  }
  return excluded
}

// Tracks what marketing imports and what each primitive imports, so the
// coverage check can run once the walk is done.
export class MarketingCss {
  constructor(excludedUi) {
    this.excludedUi = excludedUi
    this.usedUi = new Set()
    this.uiImports = new Map() // primitive name -> names it imports from ./
  }

  checkMarketingImports(file, text, { problems }) {
    for (const spec of importSpecs(text)) {
      const name = /^@\/components\/ui\/([\w-]+)$/.exec(spec)?.[1]
      if (!name) continue
      this.usedUi.add(name)
      if (this.excludedUi.has(name))
        problems.push(`${file}: imports ui/${name}, which ${GLOBALS} excludes from the marketing CSS (@source not)`)
    }
  }

  recordUi(name, text) {
    const deps = importSpecs(text).map((spec) => uiSpecRe.exec(spec)?.[1]).filter(Boolean)
    this.uiImports.set(name, deps)
  }

  checkCoverage({ problems }) {
    const used = new Set(this.usedUi)
    for (const name of used) for (const dep of this.uiImports.get(name) ?? []) used.add(dep)
    for (const [name, deps] of this.uiImports) {
      if (used.has(name))
        for (const dep of deps)
          if (this.excludedUi.has(dep))
            problems.push(`ui/${name} imports ./${dep}, which ${GLOBALS} excludes from the marketing CSS`)
      if (!used.has(name) && !this.excludedUi.has(name))
        problems.push(`ui/${name} is neither used by marketing nor excluded from the marketing CSS (add an @source not line in ${GLOBALS})`)
    }
  }
}
