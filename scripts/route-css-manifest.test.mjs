import { test } from "node:test"
import assert from "node:assert/strict"
import { selectorsOf, rulesOf, diffManifests } from "./route-css-manifest.mjs"

test("selectorsOf lists each selector once, sorted", () => {
  const css = ".b{color:red}.a{color:blue}.b:hover{color:green}@media (min-width:768px){.c{display:none}}"
  assert.deepEqual(selectorsOf(css), [".a", ".b", ".b:hover", ".c"])
})

test("diffManifests names routes that came or went and css whose selectors changed", () => {
  const before = { routes: ["/", "/pricing"], css: { "a.css": { bytes: 10, selectors: "h1" } } }
  const after = { routes: ["/", "/about"], css: { "a.css": { bytes: 12, selectors: "h2" } } }
  assert.deepEqual(diffManifests(before, after), [
    "route missing: /pricing",
    "route added: /about",
    "css changed: a.css (selectors h1 -> h2, 10 -> 12 bytes)",
  ])
})

test("diffManifests accepts one stylesheet split into chunks when every selector is still present", () => {
  const before = { routes: [], css: { "x.css": { bytes: 10, selectors: "h1", list: [".a", ".b"], rules: [".a{x:1}", ".b{x:2}"] } } }
  const split = { routes: [], css: { "y.css": { bytes: 6, selectors: "h2", list: [".a"], rules: [".a{x:1}"] }, "z.css": { bytes: 6, selectors: "h3", list: [".b", ".app"], rules: [".b{x:2}", ".app{x:3}"] } } }
  assert.deepEqual(diffManifests(before, split), [])
  const lost = { routes: [], css: { "y.css": { bytes: 6, selectors: "h2", list: [".a"], rules: [".a{x:1}"] } } }
  assert.deepEqual(diffManifests(before, lost), ["css missing: x.css"])
})

test("rulesOf splits top-level rules, keeps at-rule blocks whole and sorts", () => {
  const css = "@layer base{:root{--a:1}body{color:red}}@property --x{syntax:'*'}a[href]{color:blue}@import 'x';"
  assert.deepEqual(rulesOf(css), ["@import 'x';", "@layer base{:root{--a:1}body{color:red}}", "@property --x{syntax:'*'}", "a[href]{color:blue}"])
})

test("diffManifests catches a changed token or body rule that no selector shows", () => {
  const mk = (css) => ({ routes: [], css: { "x.css": { bytes: css.length, selectors: "same", text: "t" + css, list: selectorsOf(css), rules: rulesOf(css) } } })
  const before = mk(":root{--c:#111}body{color:red}")
  assert.deepEqual(diffManifests(before, mk(":root{--c:#111}body{color:red}")), [])
  const after = mk(":root{--c:#222}body{color:red}")
  after.css["x.css"].selectors = "same"
  after.css["x.css"].bytes = before.css["x.css"].bytes
  assert.equal(diffManifests(before, after).length, 1)
  const split = { routes: [], css: { "a.css": { bytes: 1, selectors: "p", text: "p", list: [], rules: [":root{--c:#222}"] }, "b.css": { bytes: 1, selectors: "q", text: "q", list: [], rules: ["body{color:red}"] } } }
  assert.equal(diffManifests(before, split).length, 1)
})
