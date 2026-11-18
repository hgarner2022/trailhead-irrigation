// Tests for the admin's one-recipe rules (scripts/design-gate/admin-rules.mjs). Each case builds its own fake src/ tree and runs the design
// gate on it, as check-design.test.mjs does. Run with: npm run test:gate
import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { ALLOW, screenText } from "./design-gate/admin-rules.mjs"

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-design.mjs")

function run(files) {
  const root = mkdtempSync(join(tmpdir(), "admin-rules-"))
  try {
    for (const [rel, body] of Object.entries(files)) {
      const file = join(root, "src", rel)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, body)
    }
    const r = spawnSync(process.execPath, [SCRIPT, "--dir", join(root, "src")], { cwd: root, encoding: "utf8" })
    return { status: r.status, out: r.stdout + r.stderr }
  } finally {
    chmodSync(root, 0o700)
    rmSync(root, { recursive: true, force: true })
  }
}

const STORY = `export default { title: "x" }\nexport const Default = {}\nexport const Empty = {}\nexport const Phone = {}\n`
const screen = (name, body) => ({ [`app/(admin)/admin/_screens/${name}.tsx`]: body })

// one primary per page

test("a PageHeader with two filled buttons fails", () => {
  const r = run(screen("Page", `export const P = () => <PageHeader title="Jobs" actions={<><Button>New job</Button><Button variant="default">Export</Button></>} />\n`))
  assert.equal(r.status, 1)
  assert.match(r.out, /Page\.tsx:1: a PageHeader holds 2 filled buttons/)
})

test("a PageHeader with one filled button and outlines passes", () => {
  const r = run(screen("Page", `export const P = () => <PageHeader title="Jobs" actions={<><Button>New job</Button><Button variant="outline">Export</Button></>} />\n`))
  assert.equal(r.status, 0, r.out)
})

// no filled buttons in a panel body

test("a filled button in a panel body file fails; an outline or ghost passes", () => {
  const bad = run(screen("JobMoneySection", `export const S = () => <section><Button type="button" onClick={go}>Send</Button></section>\n`))
  assert.equal(bad.status, 1)
  assert.match(bad.out, /JobMoneySection\.tsx:1: a filled button in a panel body/)
  const ok = run(screen("JobMoneySection", `export const S = () => <section><Button variant="outline">Send</Button><Button variant="ghost">Edit</Button></section>\n`))
  assert.equal(ok.status, 0, ok.out)
})

test("a filled button in a screen that is not a panel body passes", () => {
  const r = run(screen("NewThing", `export const S = () => <Button onClick={go}>Add</Button>\n`))
  assert.equal(r.status, 0, r.out)
})

// banned words

test("Owed, Overdue, Bill, Cancelled, Lapsed, Truck and This visit is done fail on a screen", () => {
  for (const [text, word] of [["Owed", "Owed"], ["Overdue", "Overdue"], ["Send a Bill", "Bill"], ["Cancelled", "Cancelled"], ["Lapsed", "Lapsed"], ["Truck 1", "Truck"], ["This visit is done", "This visit is done"]]) {
    const r = run(screen("Thing", `export const T = () => <p title="${text}">x</p>\n`))
    assert.equal(r.status, 1, `${text}: ${r.out}`)
    assert.match(r.out, new RegExp(`Thing\\.tsx:1: banned word ${word}`))
  }
})

test("a banned word in JSX text fails; the status key \"cancelled\" and a comment do not", () => {
  const bad = run(screen("Thing", `export const T = () => <p>Bill the customer</p>\n`))
  assert.equal(bad.status, 1)
  const ok = run(screen("Thing", `// an Overdue invoice is Past due\nexport const isGone = (s: string) => s === "cancelled"\nexport const T = () => <p>Past due</p>\n`))
  assert.equal(ok.status, 0, ok.out)
})

test("an arrow function is not JSX text", () => {
  const r = run(screen("Thing", `const f = (visits: Visit[]) => visits.map((v) => v.id)\nexport const T = () => <p>Done</p>\n`))
  assert.equal(r.status, 0, r.out)
})

// "visit" only in the job and visit panels

test("the word visit on a screen outside the panels fails; inside the visit and job panels it passes", () => {
  const bad = run(screen("HomeThing", `export const T = () => <h2>Today's visits</h2>\n`))
  assert.equal(bad.status, 1)
  assert.match(bad.out, /HomeThing\.tsx:1: the word "visit" outside the job and visit panels/)
  for (const name of ["VisitPanel", "JobPanel", "VisitFooter", "job-footer-model"]) {
    const ok = run({ [`app/(admin)/admin/_screens/${name}.tsx`]: `export const T = () => <h2>Today's visits</h2>\n` })
    assert.equal(ok.status, 0, `${name}: ${ok.out}`)
  }
})

test("code that mentions visits (identifiers, a console line, a data-slot) is not screen text", () => {
  const r = run(screen("Thing", `console.info("move visit", visitId)\nexport const T = ({ visits }) => <div data-slot="visit-list" className="visit-row">{visits.length}</div>\n`))
  assert.equal(r.status, 0, r.out)
})

// overlays through blocks

test("ui/dialog, ui/sheet and ui/popover imported outside blocks fail; blocks may import them", () => {
  for (const mod of ["dialog", "sheet", "popover"]) {
    const bad = run(screen("Thing", `import { X } from "@/components/ui/${mod}"\nexport const T = () => <X />\n`))
    assert.equal(bad.status, 1, mod)
    assert.match(bad.out, new RegExp(`Thing\\.tsx:1: imports ui/${mod} \\(overlays come from blocks/\\)`))
  }
  const ok = run({ "components/blocks/Over.tsx": `import { Dialog } from "@/components/ui/dialog"\nexport const O = () => <Dialog />\n`, "components/blocks/Over.stories.tsx": STORY })
  assert.equal(ok.status, 0, ok.out)
})

// no table or label outside DataGrid and FormRow

test("<table> and <label> in a screen fail; inside DataGrid and FormRow they pass", () => {
  const label = run(screen("Thing", `export const T = () => <label htmlFor="a">A</label>\n`))
  assert.equal(label.status, 1)
  assert.match(label.out, /Thing\.tsx:1: <label> outside DataGrid and FormRow/)
  const table = run(screen("Thing", `export const T = () => <table />\n`))
  assert.equal(table.status, 1)
  const ok = run({
    "components/blocks/FormRow.tsx": `export const F = () => <label htmlFor="a">A</label>\n`,
    "components/blocks/FormRow.stories.tsx": STORY,
    "components/blocks/DataGrid.tsx": `export const D = () => <table />\n`,
    "components/blocks/DataGrid.stories.tsx": STORY,
  })
  assert.equal(ok.status, 0, ok.out)
})

// eight columns at most

test("a grid with more than eight columns fails; eight pass", () => {
  const cols = (n) => `export const cols: GridColumnDef<Row>[] = [\n${Array.from({ length: n }, (_, i) => `  { id: "c${i}", header: "C${i}" },`).join("\n")}\n]\n`
  const bad = run({ "app/(admin)/admin/_screens/thing-columns.tsx": cols(9) })
  assert.equal(bad.status, 1)
  assert.match(bad.out, /thing-columns\.tsx:1: 9 columns \(at most 8\)/)
  const ok = run({ "app/(admin)/admin/_screens/thing-columns.tsx": cols(8) })
  assert.equal(ok.status, 0, ok.out)
})

// stories for the new blocks

test("a new block's stories need Default, Empty and Phone", () => {
  const r = run({ "components/blocks/RecordPanel.tsx": `export const R = () => <div />\n`, "components/blocks/RecordPanel.stories.tsx": `export default { title: "x" }\nexport const Default = {}\n` })
  assert.equal(r.status, 1)
  assert.match(r.out, /RecordPanel\.stories\.tsx: no Empty story/)
  assert.match(r.out, /RecordPanel\.stories\.tsx: no Phone story/)
  const ok = run({ "components/blocks/RecordPanel.tsx": `export const R = () => <div />\n`, "components/blocks/RecordPanel.stories.tsx": STORY })
  assert.equal(ok.status, 0, ok.out)
})

// the allowlist

test("an allowlisted file reports a note with its date and step instead of failing", () => {
  const r = run({ "app/(admin)/admin/_screens/HomeScreen.tsx": `export const T = () => <h2>Today's visits</h2>\n` })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /HomeScreen\.tsx: visit-word allowed until Nov 18 2026, step 3/)
})

test("every allowlist entry names a date and a step of the build order", () => {
  for (const [file, rules] of Object.entries(ALLOW)) for (const [rule, why] of Object.entries(rules)) assert.match(why, /^Nov 18 2026, step \d+:/, `${file} ${rule}`)
})

test("screenText finds string literals and JSX text and keeps line numbers", () => {
  const found = [...screenText(`import { a } from "x"\n// Bill\nconst k = "key-only"\nconst t = "Two words"\nconst j = <p>Plain text</p>\n`)]
  assert.deepEqual(found.map((f) => [f.s, f.line]), [["Two words", 4], ["Plain text", 5]])
})
