// Tests for the design gate (scripts/check-design.mjs). Each case builds its
// own fake src/ tree in a temp folder and runs the script against it, so one
// failure never leaks into another. Run with: npm run test:gate
import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-design.mjs")

// files: { "components/blocks/Good.tsx": "...", ... } relative to src/
function run(files) {
  const root = mkdtempSync(join(tmpdir(), "check-design-"))
  try {
    for (const [rel, body] of Object.entries(files)) {
      const file = join(root, "src", rel)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, body)
    }
    const r = spawnSync(process.execPath, [SCRIPT, "--dir", join(root, "src")], { cwd: root, encoding: "utf8" })
    return { status: r.status, out: r.stdout + r.stderr }
  } finally {
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
