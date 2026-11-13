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

test("a Tailwind palette colour in the checkout group fails", () => {
  const r = run({
    "app/(checkout)/season-pass/checkout/_screens/Flow.tsx": `export const Flow = () => <p className="text-red-500">x</p>\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /app\/\(checkout\)\/season-pass\/checkout\/_screens\/Flow\.tsx: .*palette colour/)
})

test("an inline style hex in the account group fails", () => {
  const r = run({
    "app/(account)/account/pass/_screens/Page.tsx": `export const Page = () => <div style={{ color: "#2B3544" }} />\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /app\/\(account\)\/account\/pass\/_screens\/Page\.tsx: .*raw colour/)
})

test("a checkout screen importing a marketing section fails", () => {
  const r = run({
    "app/(checkout)/season-pass/checkout/_screens/Leak.tsx": `import { SeasonPassCalculator } from "@/components/sections/SeasonPassCalculator"\nexport const L = () => <SeasonPassCalculator />\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /app\/\(checkout\)\/season-pass\/checkout\/_screens\/Leak\.tsx: imports a marketing section/)
})

test("a marketing section importing from the account group fails", () => {
  const r = run({
    "components/sections/Leak.tsx": `import { PassPageScreen } from "@/app/(account)/account/pass/_screens/PassPageScreen"\nexport const L = () => <PassPageScreen />\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/sections\/Leak\.tsx: marketing code imports admin code/)
})

test("clean checkout and account screens pass", () => {
  const r = run({
    "app/(checkout)/season-pass/checkout/_screens/Flow.tsx": `import { Button } from "@/components/ui/button"\nexport const Flow = () => <Button className="bg-primary" />\n`,
    "app/(account)/account/pass/_screens/Page.tsx": `import { PassCard } from "@/components/blocks/PassCard"\nexport const Page = () => <PassCard className="text-navy" />\n`,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
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

const GLOBALS_BUTTON_ONLY = `@import "tailwindcss";\n@source not "../components/ui/tabs.tsx";\n@source not "../components/ui/sheet.tsx";\n`
const GLOBALS_TABS_ALLOWED = `@import "tailwindcss";\n@source not "../components/ui/sheet.tsx";\n`

test("a marketing section importing a ui primitive the marketing CSS excludes fails", () => {
  const r = run({
    "app/globals.css": GLOBALS_BUTTON_ONLY,
    "components/sections/Foo.tsx": `import { Tabs } from "@/components/ui/tabs"\nexport const Foo = () => <Tabs />\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/sections\/Foo\.tsx: imports ui\/tabs, which src\/app\/globals\.css excludes from the marketing CSS/)
})

test("a marketing page importing an excluded ui primitive fails too", () => {
  const r = run({
    "app/globals.css": GLOBALS_BUTTON_ONLY,
    "app/pricing/page.tsx": `import { Tabs } from "@/components/ui/tabs"\nexport default function Page() { return <Tabs /> }\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /app\/pricing\/page\.tsx: imports ui\/tabs, which src\/app\/globals\.css excludes/)
})

test("a marketing section importing a ui primitive the marketing CSS scans passes", () => {
  const r = run({
    "app/globals.css": GLOBALS_TABS_ALLOWED,
    "components/sections/Foo.tsx": `import { Tabs } from "@/components/ui/tabs"\nexport const Foo = () => <Tabs />\n`,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

test("an admin page importing an excluded ui primitive passes regardless", () => {
  const r = run({
    "app/globals.css": GLOBALS_BUTTON_ONLY,
    "app/(admin)/x/page.tsx": `import { Tabs } from "@/components/ui/tabs"\nexport default function Page() { return <Tabs className="bg-primary" /> }\n`,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

test("the marketing CSS rule is skipped when globals.css is absent", () => {
  const r = run({
    "components/sections/Foo.tsx": `import { Tabs } from "@/components/ui/tabs"\nexport const Foo = () => <Tabs />\n`,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

// Marketing CSS leak: every ui/ primitive is either used by marketing (directly
// or through another primitive) or excluded by an @source not line.
const UI = (body = `export const X = () => <div className="bg-primary" />\n`) => body

test("a ui primitive neither used by marketing nor excluded fails", () => {
  const r = run({
    "app/globals.css": GLOBALS_BUTTON_ONLY,
    "components/sections/Foo.tsx": `import { Button } from "@/components/ui/button"\nexport const Foo = () => <Button />\n`,
    "components/ui/button.tsx": UI(),
    "components/ui/button.stories.tsx": STORY,
    "components/ui/foo.tsx": UI(),
    "components/ui/foo.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /ui\/foo is neither used by marketing nor excluded from the marketing CSS \(add an @source not line in src\/app\/globals\.css\)/)
})

test("a ui primitive used only through another primitive passes", () => {
  const r = run({
    "app/globals.css": GLOBALS_BUTTON_ONLY,
    "components/sections/Foo.tsx": `import { Carousel } from "@/components/ui/carousel"\nexport const Foo = () => <Carousel />\n`,
    "components/ui/carousel.tsx": `import { Button } from "./button"\nexport const Carousel = () => <Button className="bg-primary" />\n`,
    "components/ui/carousel.stories.tsx": STORY,
    "components/ui/button.tsx": UI(),
    "components/ui/button.stories.tsx": STORY,
    "components/ui/tabs.tsx": UI(),
    "components/ui/tabs.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

test("a scanned ui primitive importing an excluded one fails", () => {
  const r = run({
    "app/globals.css": GLOBALS_BUTTON_ONLY,
    "components/sections/Foo.tsx": `import { Carousel } from "@/components/ui/carousel"\nexport const Foo = () => <Carousel />\n`,
    "components/ui/carousel.tsx": `import { Tabs } from "./tabs"\nexport const Carousel = () => <Tabs className="bg-primary" />\n`,
    "components/ui/carousel.stories.tsx": STORY,
    "components/ui/tabs.tsx": UI(),
    "components/ui/tabs.stories.tsx": STORY,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /ui\/carousel imports \.\/tabs, which src\/app\/globals\.css excludes from the marketing CSS/)
})

test("a malformed @source not line under components/ui fails", () => {
  const r = run({
    "app/globals.css": `@import "tailwindcss";\n@source not "../components/ui/*";\n`,
    "components/sections/Foo.tsx": `export const Foo = () => <div />\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /src\/app\/globals\.css: @source not "\.\.\/components\/ui\/\*" is not of the form "\.\.\/components\/ui\/<name>\.tsx"/)
})

// File cap: blocks/, ui/ and the app route groups stay at or under 300 lines.
const LINES = (n) => Array.from({ length: n }, (_, i) => `// line ${i + 1}`).join("\n") + "\n"

test("a 300-line block passes the file cap", () => {
  const r = run({
    "components/blocks/Long.tsx": LINES(299) + `export const Long = () => <div className="bg-primary" />\n`,
    "components/blocks/Long.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /design gates: ok/)
})

test("a 301-line admin screen fails the file cap", () => {
  const r = run({
    "app/(admin)/admin/_screens/Long.tsx": LINES(300) + `export const Long = () => <div className="bg-primary" />\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /app\/\(admin\)\/admin\/_screens\/Long\.tsx: 301 lines \(limit 300\); split it or add it to FILE_CAP_ALLOWLIST/)
})

test("an allowlisted shadcn file over the cap passes with a note", () => {
  const r = run({
    "components/ui/sidebar.tsx": LINES(400) + `export const Sidebar = () => <div className="bg-sidebar" />\n`,
    "components/ui/sidebar.stories.tsx": STORY,
  })
  assert.equal(r.status, 0, r.out)
  assert.match(r.out, /components\/ui\/sidebar\.tsx: 401 lines, allowlisted/)
  assert.match(r.out, /design gates: ok/)
})

test("a marketing page importing the database fails", () => {
  const r = run({
    "app/(site)/pricing/page.tsx": `import { db } from "@/db"\nexport default function Page() { return <div>{String(db)}</div> }\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /app\/\(site\)\/pricing\/page\.tsx: marketing code imports a server library \(@\/db\)/)
})

test("a marketing section importing a Stripe module fails", () => {
  const r = run({
    "components/sections/Leak.tsx": `import { client } from "@/lib/stripe/client"\nexport const L = () => <div>{String(client)}</div>\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /components\/sections\/Leak\.tsx: marketing code imports a server library \(@\/lib\/stripe\/client\)/)
})

test("a marketing page importing pass/server fails", () => {
  const r = run({
    "app/(site)/season-pass/page.tsx": `import { load } from "@/lib/pass/server"\nexport default function Page() { return <div>{String(load)}</div> }\n`,
  })
  assert.equal(r.status, 1)
  assert.match(r.out, /marketing code imports a server library \(@\/lib\/pass\/server\)/)
})

test("an admin page importing the database passes", () => {
  const r = run({
    "app/(admin)/admin/page.tsx": `import { db } from "@/db"\nexport default function Page() { return <div className="bg-cream">{String(db)}</div> }\n`,
  })
  assert.equal(r.status, 0, r.out)
})

test("a booking page importing the database passes and is not marketing", () => {
  const r = run({
    "app/(booking)/book/page.tsx": `import { db } from "@/db"\nexport default function Page() { return <div className="bg-cream">{String(db)}</div> }\n`,
  })
  assert.equal(r.status, 0, r.out)
})

test("a marketing page importing the shared season, flag and form-id modules passes", () => {
  const r = run({
    "app/(site)/season-pass/page.tsx": `import { PASS } from "@/lib/season-pass"\nimport { checkoutEnabled } from "@/lib/flags"\nimport { FORM } from "@/lib/jobber"\nexport default function Page() { return <div>{String(PASS)}{String(checkoutEnabled)}{String(FORM)}</div> }\n`,
  })
  assert.equal(r.status, 0, r.out)
})

test("a route group's not-found may import the marketing Header and Footer, nothing else from sections", () => {
  const ok = run({
    "app/(checkout)/not-found.tsx": `import { Header } from "@/components/sections/Header"\nimport { Footer } from "@/components/sections/Footer"\nexport default function N() { return <><Header /><Footer /></> }\n`,
  })
  assert.equal(ok.status, 0, ok.out)
  const bad = run({
    "app/(checkout)/not-found.tsx": `import { Hero } from "@/components/sections/Hero"\nexport default function N() { return <Hero /> }\n`,
  })
  assert.equal(bad.status, 1)
  assert.match(bad.out, /imports a marketing section/)
  const page = run({
    "app/(checkout)/page.tsx": `import { Header } from "@/components/sections/Header"\nexport default function P() { return <Header /> }\n`,
  })
  assert.equal(page.status, 1)
})

test("the hex block in emails/layout.ts is allowed", () => {
  const r = run({ "emails/layout.ts": `// email-colors:start\nexport const C = { navy: "#2B3544" }\n// email-colors:end\nexport const x = 1\n` })
  assert.equal(r.status, 0, r.out)
})

test("a hex outside the block in emails/layout.ts fails", () => {
  const r = run({ "emails/layout.ts": `// email-colors:start\nexport const C = { navy: "#2B3544" }\n// email-colors:end\nexport const h = '<p style="color:#ffffff">'\n` })
  assert.equal(r.status, 1)
  assert.match(r.out, /emails\/layout\.ts: .*raw colour/)
})

test("a hex in another email file fails, even inside the marker comments", () => {
  const r = run({ "emails/receipt.ts": `// email-colors:start\nexport const h = '<p style="color:#ffffff">'\n// email-colors:end\n` })
  assert.equal(r.status, 1)
  assert.match(r.out, /emails\/receipt\.ts: .*raw colour/)
})

test("a second block in emails/layout.ts fails", () => {
  const block = `// email-colors:start\nexport const A = { a: "#2B3544" }\n// email-colors:end\n`
  const r = run({ "emails/layout.ts": block + block })
  assert.equal(r.status, 1)
  assert.match(r.out, /more than one email-colors block/)
})
