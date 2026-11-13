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
