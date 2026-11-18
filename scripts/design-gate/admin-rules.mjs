// The admin's one-recipe rules (docs/plans/2026-11-18-admin-holistic-design.md, section 9). Each rule says what it
// checks and fails with a file name and the line. They run on the (admin) route group and blocks/ only; stories and
// tests are exempt. A screen that still fails a rule is named in ALLOW with the date and the build-order step that
// removes it, so the list only ever shrinks (docs/DESIGN.md, "The recipe").
//
//   one-primary         a PageHeader holds at most one filled button
//   panel-body-buttons  no filled button in a record panel's body: only RecordFooter and a sheet's footer carry one
//   words               "Owed", "Overdue", "Bill", "Cancelled", "Lapsed", "Truck", "This visit is done" never show on a screen
//   visit-word          "visit" shows only in the job panel and the visit panel
//   overlays            ui/dialog, ui/sheet and ui/popover are imported only by blocks/
//   no-table-label      <table> and <label> only inside DataGrid and FormRow
//   columns             a grid's columns array holds eight columns at most
//   new-block-stories   each new block's stories file has Default, Empty and Phone
import { existsSync, readFileSync } from "node:fs"

/** The nine blocks step 1 adds; each needs Default, Empty and Phone stories. */
export const NEW_BLOCKS = ["RecordPanel", "RecordFooter", "ConfirmDialog", "SplitButton", "MoneyCell", "FormRow", "SectionHeading", "StatusPill", "SegmentedControl"]

/**
 * file (path suffix) -> { rule: "date, the build-order step that removes it" }. A file in here still fails the rule; it is the debt, and each
 * entry names the step of docs/plans/2026-11-18-admin-holistic-design.md, section 12, that pays it off. Delete the entry when it does.
 */
export const ALLOW = {
  // visit: the left column loses Visits (step 2), Home and the Schedule take plain words (step 3), the grids get their final columns (step 9)
  "(shell)/visits/page.tsx": { "visit-word": "Nov 18 2026, step 2: the Visits page becomes the Schedule's List" },
  "_screens/VisitsScreen.tsx": { "visit-word": "Nov 18 2026, step 2: the Visits page becomes the Schedule's List" },
  "_screens/visits-model.ts": { "visit-word": "Nov 18 2026, step 2: the Visits page becomes the Schedule's List" },
  "_screens/HomeScreen.tsx": { "visit-word": "Nov 18 2026, step 3: Home reads Today in plain words" },
  "_screens/home-model.ts": { "visit-word": "Nov 18 2026, step 3: Home reads Today in plain words" },
  "_screens/TodayVisits.tsx": { "visit-word": "Nov 18 2026, step 3: Home reads Today in plain words" },
  "_screens/ScheduleScreen.tsx": {
    "one-primary": "Nov 18 2026, step 3: New job becomes the page's one primary and Place all moves under Unscheduled",
  },
  "_screens/schedule-model.ts": { "visit-word": "Nov 18 2026, step 3: the Schedule says jobs and days" },
  "_screens/RevenueScreen.tsx": { "visit-word": "Nov 18 2026, step 9: Reports reads every job" },
  "_screens/customers-columns.tsx": { "visit-word": "Nov 18 2026, step 9: the final column sets", columns: "Nov 18 2026, step 9: the final column sets (ten today, eight then)" },
  "_screens/jobs-columns.tsx": { "visit-word": "Nov 18 2026, step 9: the final column sets", columns: "Nov 18 2026, step 9: the final column sets (nine today, eight then)" },
  "_screens/jobs-model.ts": { "visit-word": "Nov 18 2026, step 9: the Progress column reads '1 of 2 done'" },
  "_screens/passes-model.ts": { "visit-word": "Nov 18 2026, step 9: the final words of the Customers panel" },
  "_screens/settings-model.ts": { "visit-word": "Nov 18 2026, step 6: Settings shell, People and Services" },
  "_screens/settings-tabs/Capacity.tsx": { "visit-word": "Nov 18 2026, step 6: the Capacity tab goes" },
  "_screens/settings-tabs/People.tsx": { "visit-word": "Nov 18 2026, step 6: People gets Takes visits and hours", words: "Nov 18 2026, step 6: Takes visits replaces the truck label", "no-table-label": "Nov 18 2026, step 6: People becomes a list with a sheet" },
  // overlays: New job moves onto the sheet recipe (step 2) and Settings onto its shell (step 6)
  "_screens/NewJob.tsx": { overlays: "Nov 18 2026, step 2: New job becomes SidePanel variant sheet", "no-table-label": "Nov 18 2026, step 2: New job's fields become FormRows" },
  "_screens/settings-tabs/ApiKeys.tsx": { overlays: "Nov 18 2026, step 6: Settings shell", "no-table-label": "Nov 18 2026, step 6: Settings shell (FormRow and the list recipe)" },
  "_screens/settings-tabs/Billing.tsx": { "no-table-label": "Nov 18 2026, step 6: Settings shell (FormRow)" },
  "_screens/settings-tabs/Services.tsx": { "no-table-label": "Nov 18 2026, step 6: Services becomes a list with a sheet" },
  "_screens/settings-tabs/Messages.tsx": { overlays: "Nov 18 2026, step 6: Settings shell" },
  "_screens/settings-tabs/fields.tsx": { overlays: "Nov 18 2026, step 6: Settings shell (ConfirmButton becomes ConfirmDialog)" },
  // forms: New job's fields become FormRows with the sheet recipe (step 2); Settings fields with the shell (step 6)
  "_screens/CustomerPicker.tsx": { "no-table-label": "Nov 18 2026, step 2: New job's fields become FormRows" },
  "_screens/ScheduleMoveTo.tsx": { "visit-word": "Nov 18 2026, step 4: Move becomes its dialog", "no-table-label": "Nov 18 2026, step 4: Move becomes its dialog" },
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

// The job panel, the visit panel and their parts. VisitsScreen, VisitPanelHost and JobsScreen are pages and hosts, not panels.
const VISIT_OK = /(^|\/)(JobPanel|JobFooter|JobDialogs|JobCollect|JobLinesSection|JobMoneySection|JobPills|VisitPanel|VisitFooter|VisitEditText|VisitMoveDone|VisitOnMyWay|VisitLines|VisitBill|job-[\w-]+|visit-[\w-]+|use-runner|PanelNotes|PassPanel|NewJob[A-Za-z]*|CustomerJobs|ConfirmDialog|RecordPanel|RecordFooter)\.tsx?$/
const VISIT_WORD = /\b[Vv]isits?\b/

function checkVisitWord(file, text, problems) {
  // the API's own docs page names the resources the API has; it is not an admin screen
  if (VISIT_OK.test(file) || /\(admin\)\/developers\//.test(file)) return
  for (const { s, line } of screenText(text)) if (VISIT_WORD.test(s)) problems.push(`${file}:${line}: the word "visit" outside the job and visit panels`)
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
// CancelVisitSheet and RescheduleSheet are the customer's account, which is not part of this system (section 9, "Kept").
const TABLE_OK = /(^|\/)(DataGrid|data-grid-[\w-]+|FormRow|Chart|WeekGrid|CancelVisitSheet|RescheduleSheet|NextVisitCard|SignInCard)\.tsx$/

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
  ["visit-word", checkVisitWord],
  ["one-primary", checkOnePrimary],
  ["panel-body-buttons", checkPanelButtons],
  ["overlays", checkOverlays],
  ["no-table-label", checkTableLabel],
  ["columns", checkColumns],
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
    if (block && ["words", "visit-word", "one-primary", "panel-body-buttons", "columns"].includes(rule) && !/blocks\/(RecordPanel|RecordFooter|ConfirmDialog|SplitButton|MoneyCell|FormRow|SectionHeading|StatusPill|SegmentedControl)\.tsx$/.test(rel)) continue
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
