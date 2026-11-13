import { test } from "node:test"
import assert from "node:assert/strict"
import { selectorsOf, diffManifests } from "./route-css-manifest.mjs"

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
  const before = { routes: [], css: { "x.css": { bytes: 10, selectors: "h1", list: [".a", ".b"] } } }
  const split = { routes: [], css: { "y.css": { bytes: 6, selectors: "h2", list: [".a"] }, "z.css": { bytes: 6, selectors: "h3", list: [".b", ".app"] } } }
  assert.deepEqual(diffManifests(before, split), [])
  const lost = { routes: [], css: { "y.css": { bytes: 6, selectors: "h2", list: [".a"] } } }
  assert.deepEqual(diffManifests(before, lost), ["css missing: x.css"])
})
