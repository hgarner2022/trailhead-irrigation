// Screenshots of the stories at 1280 and 375, headless. node shots.mjs <outDir> [filter]
import { chromium } from "playwright"
import fs from "node:fs"

const out = process.argv[2]
const only = process.argv[3]
fs.mkdirSync(out, { recursive: true })
const BASE = "http://localhost:6014/iframe.html?viewMode=story&id="
const W = { 1280: { width: 1280, height: 900 }, 375: { width: 375, height: 812 } }

// name, story id, width, optional steps
const shots = [
  ["01-rail-jobs-list", "admin-jobs-grid--jobs-grid", 1280],
  ["02-rail-invoices-lit", "admin-invoices--list", 1280],
  ["03-rail-quotes-lit", "admin-quotes--list", 1280],
  ["04-rail-requests-lit", "admin-requests--list", 1280],
  ["05-tabbar-phone", "admin-invoices--list-phone", 375],
  ["06-more-sheet-phone", "admin-invoices--list-phone", 375, async (p) => { await p.locator("[data-slot=admin-more]").click(); await p.getByRole("dialog", { name: "More" }).waitFor() }],
  ["07-more-sheet-requests-phone", "admin-requests--list-phone", 375, async (p) => { await p.locator("[data-slot=admin-more]").click(); await p.getByRole("dialog", { name: "More" }).waitFor() }],
  ["10-job-page", "admin-job-page-one-visit--scheduled-ahead", 1280],
  ["11-job-page-phone", "admin-job-page-one-visit--scheduled-ahead-phone", 375],
  ["12-job-pass", "admin-job-page-season-pass-and-return-visit--one-done", 1280],
  ["13-job-return-visit", "admin-job-page-season-pass-and-return-visit--return-visit", 1280],
  ["14-job-from-quote", "admin-quotes--job-from-quote", 1280],
  ["20-quote-page", "admin-quotes--quote-sent", 1280],
  ["21-quote-page-phone", "admin-quotes--quote-sent-phone", 375],
  ["30-invoice-page", "admin-invoices--invoice-sent", 1280],
  ["31-invoice-page-phone", "admin-invoices--invoice-sent-phone", 375],
  ["40-request-page", "admin-requests--new", 1280],
  ["41-request-page-phone", "admin-requests--new-phone", 375],
  ["50-customer-page", "admin-customer-page--pass-holder-unpaid", 1280],
  ["51-customer-page-phone", "admin-customer-page--pass-holder-unpaid-phone", 375],
  ["60-search-invoice-number", "admin-invoices--search-by-number", 1280],
  ["61-search-invoice-number-phone", "admin-invoices--search-by-number-phone", 375],
  ["62-search-quote-number", "admin-quotes--search-by-number", 1280],
  ["63-search-quote-number-phone", "admin-quotes--search-by-number-phone", 375],
  ["70-walk-rail", "admin-walkthrough-clickable--laptop", 1280],
  ["71-walk-search-invoice", "admin-walkthrough-clickable--laptop", 1280, async (p) => { await p.getByRole("button", { name: "Search" }).click(); await p.getByPlaceholder("Search by name, street, phone or pass number").fill("INV-2026-0035"); await p.getByRole("option", { name: /INV-2026-0035/ }).waitFor() }],
  ["72-walk-search-invoice-opened", "admin-walkthrough-clickable--laptop", 1280, async (p) => { await p.getByRole("button", { name: "Search" }).click(); await p.getByPlaceholder("Search by name, street, phone or pass number").fill("0035"); await p.getByRole("option", { name: /INV-2026-0035/ }).click(); await p.getByRole("heading", { level: 1, name: "INV-2026-0035" }).waitFor() }],
  ["73-walk-search-quote", "admin-walkthrough-clickable--laptop", 1280, async (p) => { await p.getByRole("button", { name: "Search" }).click(); await p.getByPlaceholder("Search by name, street, phone or pass number").fill("Q-2026-000"); await p.getByRole("option").first().waitFor() }],
  ["74-walk-crumb-customer-from-invoices", "admin-walkthrough-clickable--laptop", 1280, async (p) => {
    await p.locator("[data-slot=sidebar]").getByRole("link", { name: /Invoices/ }).click()
    await p.getByRole("heading", { level: 1, name: "Invoices" }).waitFor()
    await p.getByRole("link", { name: /INV-2026-0035/ }).first().click()
    await p.getByRole("heading", { level: 1, name: "INV-2026-0035" }).waitFor()
    await p.locator("[data-slot=record-page-aside]").getByRole("link", { name: /Marcus Bell/ }).first().click()
    await p.getByRole("heading", { level: 1, name: "Marcus Bell" }).waitFor()
  }],
  ["75-walk-crumb-customers-list", "admin-walkthrough-clickable--laptop", 1280, async (p) => {
    await p.locator("[data-slot=sidebar]").getByRole("link", { name: /Invoices/ }).click()
    await p.getByRole("link", { name: /INV-2026-0035/ }).first().click()
    await p.getByRole("heading", { level: 1, name: "INV-2026-0035" }).waitFor()
    await p.locator("[data-slot=record-page-aside]").getByRole("link", { name: /Marcus Bell/ }).first().click()
    await p.getByRole("heading", { level: 1, name: "Marcus Bell" }).waitFor()
    await p.locator("[data-slot=record-page-header]").getByRole("link", { name: /Customers/ }).click()
    await p.getByRole("heading", { level: 1, name: "Customers" }).waitFor()
  }],
  ["76-walk-more-phone", "admin-walkthrough-clickable--phone", 375, async (p) => { await p.locator("[data-slot=admin-more]").click(); await p.getByRole("dialog", { name: "More" }).waitFor() }],
  ["80-jobs-list-no-quote-later", "admin-walkthrough-clickable--laptop", 1280],
  ["81-customer-no-quotes-card", "admin-customer-page--nothing-yet", 1280],
]

const browser = await chromium.launch()
const report = []
for (const [name, id, w, steps] of shots) {
  if (only && !only.split(",").some((o) => name.startsWith(o))) continue
  const ctx = await browser.newContext({ viewport: W[w], deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  try {
    await page.goto(BASE + id, { waitUntil: "domcontentloaded" })
    await page.waitForSelector("#storybook-root > *", { timeout: 45000 })
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForTimeout(1500)
    if (steps) { await steps(page); await page.waitForTimeout(700) }
    const file = `${out}/${name}-${w}.png`
    await page.screenshot({ path: file })
    const h1 = await page.locator("#storybook-root h1").first().textContent({ timeout: 500 }).catch(() => "")
    const sub = await page.locator("[data-slot=record-page-header] p").first().textContent({ timeout: 500 }).catch(() => "")
    const crumb = await page.locator("[data-slot=record-page-header] a").first().textContent({ timeout: 500 }).catch(() => "")
    const tab = await page.title()
    const lit = await page.locator("[data-slot=sidebar] [aria-current=page], [data-slot=admin-tabbar] [aria-current=page]").allTextContents().catch(() => [])
    const rail = await page.locator("[data-slot=sidebar] [data-sidebar=menu-button]").allTextContents().catch(() => [])
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    report.push({ name, w, h1, sub, crumb, tab, lit, rail: rail.join(" | "), overflow })
  } catch (e) {
    report.push({ name, w, error: String(e).slice(0, 300) })
  }
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(report, null, 1))
