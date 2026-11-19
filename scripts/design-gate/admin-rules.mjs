// The admin's one-recipe rules (docs/plans/2026-11-18-admin-holistic-design.md, section 9). Each rule says what it
// checks and fails with a file name and the line. They run on the (admin) route group and blocks/ only; stories and
// tests are exempt. A screen that still fails a rule is named in ALLOW with the date and the build-order step that
// removes it, so the list only ever shrinks (docs/DESIGN.md, "The recipe").
//
//   one-primary         a PageHeader holds at most one filled button
//   panel-body-buttons  no filled button in a record panel's body: only RecordFooter and a sheet's footer carry one
//   words               "Owed", "Overdue", "Bill", "Cancelled", "Lapsed", "Truck", "This visit is done" never show on a screen
//   visits-nav          Visits is not a nav item: no "Visits" label, no `visits` section and no "/admin/visits" link (it redirects to the Schedule's List view)
//   overlays            ui/dialog, ui/sheet and ui/popover are imported only by blocks/
//   no-table-label      <table> and <label> only inside DataGrid and FormRow
//   columns             a grid's columns array holds eight columns at most
//   new-block-stories   each new block's stories file has Default, Empty and Phone
import { existsSync, readFileSync } from "node:fs"

/** The nine blocks step 1 adds, and step 6's SettingsList and SaveBar; each needs Default, Empty and Phone stories. */
export const NEW_BLOCKS = ["RecordPanel", "RecordFooter", "ConfirmDialog", "SplitButton", "MoneyCell", "FormRow", "SectionHeading", "StatusPill", "SegmentedControl", "SettingsList", "SaveBar"]

/**
 * file (path suffix) -> { rule: "date, the build-order step that removes it" }. A file in here still fails the rule; it is the debt, and each
 * entry names the step of docs/plans/2026-11-18-admin-holistic-design.md, section 12, that pays it off. Delete the entry when it does.
 */
export const ALLOW = {
  // columns and words: the grids get their final columns (step 9)
  "_screens/customers-columns.tsx": { columns: "Nov 18 2026, step 9: the final column sets (ten today, eight then)" },
  "_screens/jobs-columns.tsx": { columns: "Nov 18 2026, step 9: the final column sets (nine today, eight then)" },
  // overlays: New job moves onto the sheet recipe (step 2)
  "_screens/NewJob.tsx": { overlays: "Nov 18 2026, step 2: New job becomes SidePanel variant sheet", "no-table-label": "Nov 18 2026, step 2: New job's fields become FormRows" },
  // forms: New job's fields become FormRows with the sheet recipe (step 2)
  "_screens/CustomerPicker.tsx": { "no-table-label": "Nov 18 2026, step 2: New job's fields become FormRows" },
  "_screens/NewJobPass.tsx": { "no-table-label": "Nov 18 2026, step 2: New job's fields become FormRows" },
  "_screens/NewJobService.tsx": { "no-table-label": "Nov 18 2026, step 2: New job's fields become FormRows" },
}

/** Source text with comments blanked (same length, so line numbers hold). */
export function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length))
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length

/** Text a person reads: string literals and JSX text, with import lines, paths and bare keys left out. */
export function* screenText(text) {
  const src = stripComments(text).replace(/^[ \t]*(import|export)\b[^;\n]*from\s+["'][^"']+["'];?[ \t]*$/gm, (m) => " ".repeat(m.length))
  const literal = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g
  for (const m of src.matchAll(literal)) {
    const s = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ")
    // a key, a path, a class list or a url is not text a person reads: text has a space or opens with a capital
    if (!/\s/.test(s.trim()) && !/^[A-Z]/.test(s)) continue
    if (/^[\w./:@#?=&%+-]+$/.test(s) && !/^[A-Z][a-z]+$/.test(s)) continue
    if (m.index > 0 && /\b(className|data-[\w-]+|href|id|name|type|key|htmlFor|value)=\s*$/.test(src.slice(Math.max(0, m.index - 24), m.index))) continue
    const lineStart = src.lastIndexOf("\n", m.index) + 1
    if (/\bconsole\.\w+\(/.test(src.slice(lineStart, m.index))) continue
    yield { s, line: lineOf(src, m.index) }
  }
  // JSX text between two tags, on one line or on its own lines; code that only looks like it (an arrow, a generic, a type) has operators in it and is left out
  for (const m of src.matchAll(/(?<![=\-])>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
    const text = m[1].replace(/&\w+;/g, " ")
    if (/[|=()[\]"`;?]/.test(text)) continue
    const lead = m[1].length - m[1].trimStart().length
    yield { s: text.trim(), line: lineOf(src, m.index + 1 + lead) }
  }
}

const BANNED = [
  [/\bOwed\b/, "Owed (say Unpaid)"],
  [/\bOverdue\b/, "Overdue (say Past due)"],
  [/\bBills?\b/, "Bill (say Invoice)"],
  [/\b[Cc]ancelled\b/, "Cancelled (say Canceled)"],
  [/\bLapsed\b/, "Lapsed (say Expired)"],
  [/\bTrucks?\b/, "Truck (say the person's name)"],
  [/This visit is done/, "This visit is done"],
]

function checkWords(file, text, problems) {
  for (const { s, line } of screenText(text)) for (const [re, what] of BANNED) if (re.test(s)) problems.push(`${file}:${line}: banned word ${what}`)
}

// Visits left the left column (design section 4): a visit is one trip to the house, its grid is the Schedule's third view and `/admin/visits` only
// redirects. So no nav item, no section id and no link may name it. Tests and stories are exempt (they are not in `zone`).
const VISITS_NAV = [
  [/\blabel:\s*["'`]Visits["'`]/, 'a nav item labelled "Visits"'],
  [/\bid:\s*["'`]visits["'`][^}\n]*\bhref:/, 'a nav item with the id "visits"'],
  [/\bAdminSection\b[^;\n]*["'`]visits["'`]/, 'a "visits" section'],
  [/["'`]\/admin\/visits\b/, 'a link to /admin/visits (use /admin/schedule?view=list)'],
]

// The customer's own account has a Visits page and says so; this rule is about the admin's navigation.
const ACCOUNT_SIDE = /(^|\/)(Account[A-Za-z]*|Next[A-Za-z]*Card|Cancel[A-Za-z]*|Reschedule[A-Za-z]*)\.tsx?$/

function checkVisitsNav(file, text, problems) {
  if (ACCOUNT_SIDE.test(file)) return
  const src = stripComments(text)
  for (const [re, what] of VISITS_NAV) {
    const m = re.exec(src)
    if (m) problems.push(`${file}:${lineOf(src, m.index)}: Visits is not a nav item: ${what}`)
  }
}

function* elements(text, tag) {
  const open = new RegExp(`<${tag}\\b`, "g")
  for (const m of text.matchAll(open)) {
    // the element runs to the closing "/>" or ">" that is not inside a nested {} or string
    let depth = 0
    let i = m.index + m[0].length
    for (; i < text.length; i++) {
      const c = text[i]
      if (c === "{") depth++
      else if (c === "}") depth--
      else if (depth === 0 && c === ">") break
    }
    yield { start: m.index, tag: text.slice(m.index, i + 1) }
  }
}

const filled = (tag) => !/\bvariant=/.test(tag) || /\bvariant=["{]*\s*["']?default["']?/.test(tag)

/** The text of a PageHeader's whole element (opening tag to its close), brace-balanced. */
function* pageHeaders(text) {
  for (const m of text.matchAll(/<PageHeader\b/g)) {
    let depth = 0
    let i = m.index
    for (; i < text.length; i++) {
      const c = text[i]
      if (c === "{") depth++
      else if (c === "}") depth--
      else if (depth === 0 && c === "/" && text[i + 1] === ">") {
        i += 2
        break
      }
    }
    yield { start: m.index, body: text.slice(m.index, i) }
  }
}

function checkOnePrimary(file, text, problems) {
  for (const { start, body } of pageHeaders(text)) {
    const n = [...elements(body, "Button")].filter((b) => filled(b.tag)).length
    if (n > 1) problems.push(`${file}:${lineOf(text, start)}: a PageHeader holds ${n} filled buttons (one primary per page)`)
  }
}

// Files that are a record panel's body: a panel, its sections, its forms. Their filled buttons belong in RecordFooter.
const PANEL_BODY = /(^|\/)(Customer(Panel|Jobs|CardLine)|Job(Panel|LinesSection|MoneySection)|Pass(Panel|Season)|Panel[A-Za-z]*|Property[A-Za-z]*|Visit(Panel|Edit[A-Za-z]*|Move[A-Za-z]*|Bill|Lines|OnMyWay|Page))\.tsx$/

function checkPanelButtons(file, text, problems) {
  if (!PANEL_BODY.test(file)) return
  for (const b of elements(stripComments(text), "Button")) if (filled(b.tag)) problems.push(`${file}:${lineOf(text, b.start)}: a filled button in a panel body (only RecordFooter and a sheet's footer carry one)`)
}

function checkOverlays(file, text, problems) {
  if (/\/blocks\//.test(file)) return
  for (const m of text.matchAll(/from\s+["']@\/components\/ui\/(dialog|sheet|popover)["']/g)) problems.push(`${file}:${lineOf(text, m.index)}: imports ui/${m[1]} (overlays come from blocks/)`)
}

// Chart keeps the visually hidden data table that makes a chart readable aloud; WeekGrid is the calendar of days, one of the blocks section 9 keeps;
// DayTimePicker and ServicePicker are the customer's radio cards (a card is its own label; FormRow is for text controls). CancelVisitSheet and RescheduleSheet are the customer's account, which is not part of this system (section 9, "Kept").
const TABLE_OK = /(^|\/)(DataGrid|data-grid-[\w-]+|FormRow|Chart|WeekGrid|CancelVisitSheet|RescheduleSheet|NextVisitCard|SignInCard|DayTimePicker|ServicePicker)\.tsx$/

function checkTableLabel(file, text, problems) {
  if (TABLE_OK.test(file)) return
  const src = stripComments(text)
  for (const m of src.matchAll(/<(table|label|Table|Label)\b/g)) problems.push(`${file}:${lineOf(src, m.index)}: <${m[1]}> outside DataGrid and FormRow`)
}

const MAX_COLUMNS = 8

function checkColumns(file, text, problems) {
  if (!/-columns\.tsx?$/.test(file)) return
  const src = stripComments(text)
  for (const m of src.matchAll(/GridColumnDef<[^>]*>\[\]\s*=\s*\[/g)) {
    let depth = 0
    let count = 0
    for (let i = m.index + m[0].length - 1; i < src.length; i++) {
      const c = src[i]
      if (c === "[" || c === "{" || c === "(") {
        depth++
        if (c === "{" && depth === 2) count++
      } else if (c === "]" || c === "}" || c === ")") {
        depth--
        if (depth === 0) break
      }
    }
    if (count > MAX_COLUMNS) problems.push(`${file}:${lineOf(src, m.index)}: ${count} columns (at most ${MAX_COLUMNS})`)
  }
}

const RULES = [
  ["words", checkWords],
  ["one-primary", checkOnePrimary],
  ["panel-body-buttons", checkPanelButtons],
  ["overlays", checkOverlays],
  ["no-table-label", checkTableLabel],
  ["columns", checkColumns],
  ["visits-nav", checkVisitsNav],
]

/** Runs the screen rules on one file that is in the (admin) tree or blocks/. Allowlisted files report a note, never a failure. */
export function checkAdminRules(abs, { file, dirs, fixture, name }, { problems, notes }) {
  const admin = dirs.some((d) => d === "(admin)")
  const block = dirs.includes("blocks")
  if ((!admin && !block) || fixture || !/\.tsx?$/.test(name)) return
  const text = readFileSync(abs, "utf8")
  const rel = file.split("\\").join("/")
  seen.add(rel)
  for (const [rule, run] of RULES) {
    // blocks are shared with the customer's account; the screen-only rules read the admin tree
    if (block && ["words", "one-primary", "panel-body-buttons", "columns"].includes(rule) && !/blocks\/(RecordPanel|RecordFooter|ConfirmDialog|SplitButton|MoneyCell|FormRow|SectionHeading|StatusPill|SegmentedControl)\.tsx$/.test(rel)) continue
    const found = []
    run(rel, text, found)
    if (found.length === 0) continue
    const why = allowed(rel, rule)
    if (why) notes.push(`${rel}: ${rule} allowed until ${why} (${found.length})`)
    else problems.push(...found)
  }
}

const used = new Set()
const seen = new Set()

function allowed(rel, rule) {
  for (const [suffix, rules] of Object.entries(ALLOW))
    if (rel.endsWith(suffix) && rules[rule]) {
      used.add(`${suffix}|${rule}`)
      return rules[rule]
    }
  return undefined
}

/** The list only shrinks: an entry whose file no longer fails its rule is stale and fails the gate until it is deleted. */
export function checkStaleAllow(_srcRoot, { problems }) {
  for (const [suffix, rules] of Object.entries(ALLOW)) {
    if (![...seen].some((f) => f.endsWith(suffix))) continue
    for (const rule of Object.keys(rules)) if (!used.has(`${suffix}|${rule}`)) problems.push(`${suffix}: ALLOW entry for ${rule} no longer matches a violation; delete it`)
  }
}

/** Each new block's stories file has Default, Empty and Phone. */
export function checkNewBlockStories(srcRoot, { problems }) {
  for (const name of NEW_BLOCKS) {
    const abs = `${srcRoot}/components/blocks/${name}.stories.tsx`
    if (!existsSync(`${srcRoot}/components/blocks/${name}.tsx`)) continue
    if (!existsSync(abs)) continue
    const text = readFileSync(abs, "utf8")
    for (const story of ["Default", "Empty", "Phone"]) if (!new RegExp(`export const ${story}\\b`).test(text)) problems.push(`components/blocks/${name}.stories.tsx: no ${story} story`)
  }
}
