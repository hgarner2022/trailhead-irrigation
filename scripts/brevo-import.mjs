#!/usr/bin/env node
/**
 * Imports a scrubbed contact list from .local-data/lists/ into Brevo.
 *
 * Additive only. Creates a list if one does not already exist with that name
 * and adds contacts to it. Does not delete, unsubscribe, or blocklist anyone,
 * and does not send anything.
 *
 * The API key is prompted for in the terminal with echo disabled, or read
 * from BREVO_API_KEY in .env.local. It is never taken as an argument, so it
 * stays out of shell history.
 *
 * Usage:
 *   npm run brevo:import -- --list=email_only
 *   npm run brevo:import -- --list=both
 *   npm run brevo:import -- --list=email_only --name="Blowout 2026"
 *   npm run brevo:import -- --list=email_only --dry-run
 *
 * Docs: https://developers.brevo.com/reference/importcontacts-1
 */

import { readFileSync, existsSync, appendFileSync } from "node:fs"

const API = "https://api.brevo.com/v3"
const DIR = ".local-data/lists"

function loadEnvLocal() {
  if (!existsSync(".env.local")) return
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

async function promptForKey() {
  const readline = await import("node:readline")
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  const hidden = (q) =>
    new Promise((resolve) => {
      process.stdout.write(q)
      const onData = (ch) => {
        const s = ch.toString()
        if (s === "\r" || s === "\n") return
        readline.moveCursor(process.stdout, -1, 0)
        process.stdout.write("*")
      }
      process.stdin.on("data", onData)
      rl.question("", (a) => {
        process.stdin.off("data", onData)
        process.stdout.write("\n")
        resolve(a.trim())
      })
    })
  console.log("\nPaste your Brevo API key. It will not be displayed.")
  console.log("Brevo > top-right menu > SMTP & API > API Keys\n")
  const k = await hidden("  BREVO_API_KEY: ")
  if (!k) { console.error("\nNo key entered."); process.exit(1) }
  const save = await new Promise((r) =>
    rl.question("\n  Save to .env.local so you only do this once? [Y/n] ", (a) => r(a.trim().toLowerCase())))
  rl.close()
  if (save !== "n") {
    appendFileSync(".env.local", `\nBREVO_API_KEY=${k}\n`)
    console.log("  Saved to .env.local (gitignored).\n")
  }
  process.env.BREVO_API_KEY = k
  return k
}

let CACHED = null
async function key() {
  if (CACHED) return CACHED
  loadEnvLocal()
  CACHED = process.env.BREVO_API_KEY || (await promptForKey())
  return CACHED
}

async function call(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { "api-key": await key(), accept: "application/json", "content-type": "application/json", ...(opts.headers || {}) },
  })
  const text = await res.text()
  let b
  try { b = text ? JSON.parse(text) : {} } catch { b = { raw: text } }
  if (!res.ok) { console.error(`Brevo API ${res.status}: ${JSON.stringify(b, null, 2)}`); process.exit(1) }
  return b
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]
}))

const which = args.list
if (!which) {
  console.error("Usage: npm run brevo:import -- --list=<email_only|both|text_only>")
  process.exit(1)
}

const path = `${DIR}/${which}.csv`
if (!existsSync(path)) { console.error(`Not found: ${path}`); process.exit(1) }

// Brevo's CSV import wants semicolon separators and attribute names that match
// its own contact attributes, so remap our columns to EMAIL / FIRSTNAME / SMS.
const rows = readFileSync(path, "utf8").trim().split("\n").slice(1).map((l) => {
  const c = l.split(",")
  return { first: c[0], email: c[2], phone: c[3] }
})
const withEmail = rows.filter((r) => r.email)
const csv = ["EMAIL;FIRSTNAME;SMS", ...withEmail.map((r) => `${r.email};${r.first};${r.phone ? "+1" + r.phone : ""}`)].join("\n")

const listName = args.name || `Trailhead ${which} (imported ${new Date().toISOString().slice(0, 10)})`

console.log(`\n  source     ${path}`)
console.log(`  contacts   ${withEmail.length} with an email address`)
console.log(`  new list   ${listName}`)

if (args["dry-run"]) {
  console.log("\n  DRY RUN. Nothing sent. First 3 rows of the payload:\n")
  csv.split("\n").slice(0, 4).forEach((l) => console.log("    " + l))
  process.exit(0)
}

const folders = await call("/contacts/folders?limit=50")
const folderId = folders.folders?.[0]?.id
if (!folderId) { console.error("No contact folder found in Brevo. Create one in the dashboard first."); process.exit(1) }

const out = await call("/contacts/import", {
  method: "POST",
  body: JSON.stringify({
    fileBody: csv,
    newList: { listName, folderId },
    emailBlacklist: false,
    smsBlacklist: false,
    updateExistingContacts: true,
    emptyContactsAttributes: false,
  }),
})

console.log(`\n  Import queued. processId ${out.processId ?? "(see dashboard)"}`)
console.log(`  Brevo processes imports in the background, usually within a minute.`)
console.log(`  Check it at https://app.brevo.com/contact/list-listing\n`)
console.log(`  Nothing has been sent. This only added contacts.`)
