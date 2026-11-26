// Clicks through the walkthrough to prove where the links land after the link diet (Storybook on 6013): node docs/review/2026-11-26-admin-link-diet/walk.mjs <outDir>
import { chromium } from "playwright"

const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const route = () => page.locator("[data-slot=walkthrough]").getAttribute("data-route")
const say = async (what) => console.log(`${what} -> ${await route()}`)
const nav = async (name) => {
  await page.locator("[data-slot=sidebar]").getByRole("link", { name: new RegExp("^" + name) }).first().click()
  await page.waitForTimeout(700)
}

await page.goto("http://localhost:6013/iframe.html?id=admin-walkthrough-clickable--laptop&viewMode=story", { waitUntil: "networkidle" })
await page.waitForSelector("[data-slot=walkthrough]")
await page.waitForTimeout(1500)

// Jobs: a click on the customer's name (plain text) opens the row's job
await page.locator("tbody tr", { hasText: "Marcus Bell" }).first().getByText("Marcus Bell").click()
await page.waitForTimeout(700)
await say("Jobs row, click on the customer text")
// the job page's Customer card is the one link to the customer
await page.getByRole("link", { name: /^Customer:/ }).click()
await page.waitForTimeout(700)
await say("Job page, Customer card")
await page.screenshot({ path: `${out}/walk-customer-from-job-1280.jpg`, type: "jpeg", quality: 70 })
// the customer's Jobs table: a click on the status cell opens that job
await page.locator("#jobs-h").locator("xpath=ancestor::section").locator("tbody tr").first().locator("td").nth(3).click()
await page.waitForTimeout(700)
await say("Customer page, Jobs row")

await nav("Invoices")
await page.locator("[data-slot=data-grid-table] tbody tr:visible").first().locator("td").nth(2).click()
await page.waitForTimeout(700)
await say("Invoices row, click on the job text")
await page.getByRole("link", { name: /^Job:/ }).click()
await page.waitForTimeout(700)
await say("Invoice page, Job card")

await nav("Quotes")
await page.locator("[data-slot=data-grid-table] tbody tr:visible").first().locator("td").nth(1).click()
await page.waitForTimeout(700)
await say("Quotes row, click on the customer text")

await nav("Requests")
await page.locator("[data-slot=data-grid-table] tbody tr:visible").first().locator("td").nth(2).click()
await page.waitForTimeout(700)
await say("Requests row")

await nav("Customers")
await page.locator("[data-slot=data-grid-table] tbody tr:visible").first().locator("td").nth(2).click()
await page.waitForTimeout(700)
await say("Customers row, click on the street text")
// a payment's one address is its receipt
const receipt = page.getByRole("link", { name: "View receipt" }).first()
if (await receipt.count()) {
  await receipt.click()
  await page.waitForTimeout(700)
  await say("View receipt")
}

// the chosen way to pay: no ring after a click, a ring for the keyboard
await nav("Invoices")
await page.locator("[data-slot=data-grid-table] tbody tr:visible").first().getByRole("button", { name: /^More for/ }).click()
await page.getByRole("menuitem", { name: "Collect payment" }).click()
await page.waitForTimeout(500)
// a ring is a 2px spread in the ring colour somewhere in the box shadow
const ring = () => page.evaluate(() => [...document.querySelectorAll("[data-slot=collect-payment] fieldset > div")].map((d) => /0px 0px 0px [24]px/.test(getComputedStyle(d).boxShadow)))
// a click on the radio itself: the radio holds the focus, the pointer put it there
await page.locator("[data-slot=collect-payment] fieldset input[type=radio]").nth(1).click()
await page.waitForTimeout(300)
console.log("ring on each way to pay after a click:", JSON.stringify(await ring()))
await page.screenshot({ path: `${out}/collect-after-click-1280.jpg`, type: "jpeg", quality: 80 })
await page.keyboard.press("ArrowDown")
await page.waitForTimeout(300)
console.log("ring on each way to pay after an arrow key:", JSON.stringify(await ring()))
await page.screenshot({ path: `${out}/collect-after-key-1280.jpg`, type: "jpeg", quality: 80 })
await browser.close()
