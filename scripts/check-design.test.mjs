// Tests for the design gate (scripts/check-design.mjs). Each case builds its
// own fake src/ tree in a temp folder and runs the script against it, so one
// failure never leaks into another. Run with: npm run test:gate
import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, chmodSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-design.mjs")

// files: { "components/blocks/Good.tsx": "...", ... } relative to src/. A value
// may also be { symlink: target } or { body, mode } for a file with a chmod.
function run(files) {
  const root = mkdtempSync(join(tmpdir(), "check-design-"))
  try {
    for (const [rel, body] of Object.entries(files)) {
      const file = join(root, "src", rel)
      mkdirSync(dirname(file), { recursive: true })
      if (typeof body === "string") writeFileSync(file, body)
      else if (body.symlink) symlinkSync(body.symlink, file)
      else {
        writeFileSync(file, body.body)
        chmodSync(file, body.mode)
      }
    }
    const r = spawnSync(process.execPath, [SCRIPT, "--dir", join(root, "src")], { cwd: root, encoding: "utf8" })
    return { status: r.status, out: r.stdout + r.stderr }
  } finally {
    chmodSync(root, 0o700)
    rmSync(root, { recursive: true, force: true })
  }
}

const STORY = `export default { title: "x" }\nexport const Default = {}\n`

test("a raw hex colour in a block fails", () => {
  const r = run({
    "components/blocks/Bad.tsx": `export const Bad = () => <div className="bg-[#D97706]" />\n`,
    "components/blocks/Bad.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Bad\.tsx: .*raw colour/)
})

test("a Tailwind palette colour in a block fails", () => {
  const r = run({
    "components/blocks/Palette.tsx": `export const P = () => <p className="text-red-500">x</p>\n`,
    "components/blocks/Palette.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Palette\.tsx: .*palette colour/)
})

test("a block with no story fails", () => {
  const r = run({ "components/blocks/Orphan.tsx": `export const O = () => <div className="bg-primary" />\n` })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Orphan\.tsx: no story/)
})

test("a legacy ui file with a palette colour passes with a legacy line", () => {
  const r = run({
    "components/ui/input.tsx": `export const Input = () => <input className="border-red-500" />\n`,
    "components/ui/input.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /components\/ui\/input\.tsx: legacy, migrate when touched/)
  assert.match(r.out, /design gates: ok/)
})

test("tokens only, with a story that uses hex for its background, passes", () => {
  const r = run({
    "components/blocks/Good.tsx": `export const Good = () => <div className="bg-primary text-white" />\n`,
    "components/blocks/Good.stories.tsx": `export default { title: "x", parameters: { backgrounds: { default: "#FAFAF8" } } }\nexport const Default = {}\n`,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
  assert.doesNotMatch(r.out, /raw colour|palette colour/)
})

test("a block importing a marketing section fails", () => {
  const r = run({
    "components/blocks/Leak.tsx": `import { Hero } from "@/components/sections/Hero"\nexport const L = () => <Hero />\n`,
    "components/blocks/Leak.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Leak\.tsx: imports a marketing section/)
})

test("a marketing section importing a block fails", () => {
  const r = run({
    "components/sections/Leak.tsx": `import { StatTile } from "@/components/blocks/StatTile"\nexport const L = () => <StatTile />\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/sections\/Leak\.tsx: marketing code imports admin code/)
})

test("an anchor href is not a colour", () => {
  const r = run({
    "components/blocks/Anchor.tsx": `export const A = () => <a href="#top" className="text-primary">Top</a>\n`,
    "components/blocks/Anchor.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
})

test("an inline style hex in the admin tree fails", () => {
  const r = run({
    "app/(admin)/admin/page.tsx": `export default function Page() { return <div style={{ color: "#2B3544" }} /> }\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /app\/\(admin\)\/admin\/page\.tsx: .*raw colour/)
})

test("marketing code outside the checked folders is not checked", () => {
  const r = run({
    "app/blog/page.tsx": `export default function Page() { return <div className="bg-[#D97706] text-red-500" /> }\n`,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

test("a dangling symlink is skipped and the script exits cleanly", () => {
  const r = run({
    "components/blocks/dead.tsx": { symlink: "missing.tsx" },
    "components/blocks/Good.tsx": `export const Good = () => <div className="bg-primary" />\n`,
    "components/blocks/Good.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
  assert.doesNotMatch(r.out, /ENOENT|at .*check-design\.mjs/)
  assert.match(r.out, /design gates: ok/)
})

test("an unreadable file is reported as a problem, not a crash", { skip: process.getuid?.() === 0 }, () => {
  const r = run({
    "components/blocks/Locked.tsx": { body: `export const L = () => null\n`, mode: 0o000 },
    "components/blocks/Locked.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Locked\.tsx: cannot read/)
  assert.doesNotMatch(r.out, /EACCES|at .*check-design\.mjs/)
})

test("a hex in an svg colour attribute fails", () => {
  const r = run({
    "components/blocks/Icon.tsx": `export const Icon = () => <svg><path stroke="#abc" d="M0 0" /></svg>\n`,
    "components/blocks/Icon.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Icon\.tsx: .*raw colour/)
})

test("a bracket in a comment does not hold the colour context open", () => {
  const r = run({
    "components/blocks/Probe.tsx": `export const P = () => <p className="a" // note (\n>Issue #1234</p>\n`,
    "components/blocks/Probe.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

test("a hex on the third line of a cn() call still fails", () => {
  const r = run({
    "components/blocks/Multi.tsx": `export const M = () => <div className={cn(\n  "p-4",\n  "bg-[#D97706]",\n)} />\n`,
    "components/blocks/Multi.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Multi\.tsx: line 3: raw colour/)
})

test("a hex-looking href beside a className is not a colour", () => {
  const r = run({
    "components/blocks/Add.tsx": `export const A = () => <a className="p" href="#add" id="#bad" aria-describedby="#fee">Add</a>\n`,
    "components/blocks/Add.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

test("a hex-looking value in an arbitrary utility is a colour", () => {
  const r = run({
    "components/blocks/Tint.tsx": `export const T = () => <div className="bg-[#add]" />\n`,
    "components/blocks/Tint.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/blocks\/Tint\.tsx: .*raw colour/)
})
