// The census behind the before and after numbers in this folder: every visible link and button of a story outside the shell (rail, top bar, tab bar,
// the prototype strip), how many are drawn in the link orange, how many are record chips and how many go to a customer.
// usage (Storybook on 6013): node docs/review/2026-11-26-admin-link-diet/count.mjs <outDir> <tag> <storyId>[:width[:nav link to press first]] ...
import { chromium } from "playwright"

const [outDir, tag, ...specs] = process.argv.slice(2)
const browser = await chromium.launch()

const census = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"
  }
  const root = document.querySelector("#storybook-root")
  const SHELL = "[data-slot=sidebar], [data-slot=sidebar-trigger], [data-slot=sidebar-rail], [data-slot=admin-tabbar], [data-slot=admin-bar-utilities], [data-slot=admin-switcher], [data-slot=walkthrough-strip]"
  const all = [...root.querySelectorAll("a[href], button, [role=button], summary")].filter(vis).filter((el) => !el.closest(SHELL))
  const orange = all.filter((el) => /rgb\((180, 83, 9|217, 119, 6|146, 64, 14)\)/.test(getComputedStyle(el).color))
  const chips = all.filter((el) => el.matches("[data-slot=record-chip]"))
  const cust = all.filter((el) => /\/admin\/customers(\?|$)/.test(el.getAttribute("href") ?? ""))
  return { click: all.length, orange: orange.length, chips: chips.length, toCustomer: cust.length, orangeText: orange.map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 28)) }
}

for (const spec of specs) {
  const [id, w = "1280", action] = spec.split(":")
  const page = await browser.newPage({ viewport: { width: +w, height: w === "375" ? 812 : 900 } })
  await page.goto(`http://localhost:6013/iframe.html?id=${id}&viewMode=story`, { waitUntil: "networkidle" })
  await page.waitForSelector("#storybook-root > *", { timeout: 120000 })
  await page.waitForTimeout(1500)
  if (action) {
    await page.getByRole("link", { name: action }).first().click()
    await page.waitForTimeout(1200)
  }
  const c = await page.evaluate(census)
  const name = `${id.replace(/^admin-/, "")}${action ? "-" + action.toLowerCase() : ""}-${w}${tag ? "-" + tag : ""}`
  await page.screenshot({ path: `${outDir}/${name}.jpg`, fullPage: true, type: "jpeg", quality: 70 })
  console.log(JSON.stringify({ name, click: c.click, orange: c.orange, chips: c.chips, toCustomer: c.toCustomer }))
  if (process.env.VERBOSE) console.log("   ", c.orangeText.join(" | "))
  await page.close()
}
await browser.close()
