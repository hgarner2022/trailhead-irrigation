#!/usr/bin/env node
/**
 * Creates a DRAFT email campaign in Brevo from a local HTML file.
 *
 * This script never sends. Brevo creates campaigns in draft status when
 * `scheduledAt` is omitted, and this script deliberately never sets that
 * field. Review the draft in the Brevo dashboard and press send there.
 *
 * The API key is read from the environment, never passed as an argument, so
 * it stays out of shell history and out of git. Put it in .env.local:
 *
 *   BREVO_API_KEY=xkeysib-...
 *
 * .env.local is already gitignored.
 *
 * Usage:
 *   npm run brevo:lists                       show your contact lists + ids
 *   npm run brevo:draft -- --list=3           create the draft for list 3
 *   npm run brevo:draft -- --list=3 --html=email/other.html
 *
 * Docs: https://developers.brevo.com/reference/create-email-campaign
 */

import { readFileSync, existsSync, appendFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { CAMPAIGNS } from "../email/campaigns.mjs"

const API = "https://api.brevo.com/v3"

const SENDER = {
  name: "Ryan at Trailhead",
  email: "ryan@trailheadirrigation.com",
}

/** Reads KEY=value pairs out of .env.local without adding a dependency. */
function loadEnvLocal() {
  if (!existsSync(".env.local")) return
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
}

/**
 * Prompts for the API key with the terminal echo off, so it never appears on
 * screen or in shell history. Offers to persist it to .env.local (gitignored)
 * so this is a one-time step.
 */
async function promptForKey() {
  const readline = await import("node:readline")
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })

  const hidden = (q) =>
    new Promise((resolve) => {
      process.stdout.write(q)
      const onData = (ch) => {
        if (ch.toString() === "\r" || ch.toString() === "\n") return
        readline.moveCursor(process.stdout, -1, 0)
        process.stdout.write("*")
      }
      process.stdin.on("data", onData)
      rl.question("", (ans) => {
        process.stdin.off("data", onData)
        process.stdout.write("\n")
        resolve(ans.trim())
      })
    })

  console.log("\nPaste your Brevo API key. It will not be displayed.")
  console.log("Find it at Brevo > top-right menu > SMTP & API > API Keys.\n")
  const k = await hidden("  BREVO_API_KEY: ")
  if (!k) {
    console.error("\nNo key entered.")
    process.exit(1)
  }

  const save = await new Promise((r) =>
    rl.question("\n  Save to .env.local so you only do this once? [Y/n] ", (a) => r(a.trim().toLowerCase()))
  )
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
    headers: {
      "api-key": await key(),
      accept: "application/json",
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    console.error(`Brevo API ${res.status}: ${JSON.stringify(body, null, 2)}`)
    process.exit(1)
  }
  return body
}

async function showLists() {
  const d = await call("/contacts/lists?limit=50")
  if (!d.lists?.length) {
    console.log("No contact lists yet. Create one in Brevo and import your customers first.")
    return
  }
  console.log("Your Brevo contact lists:\n")
  for (const l of d.lists) {
    console.log(`  id ${String(l.id).padEnd(5)} ${String(l.totalSubscribers).padStart(6)} contacts   ${l.name}`)
  }
  console.log("\nThen: npm run brevo:draft -- --list=<id>")
}

async function createDraft(args) {
  const slug = args.campaign
  const c = CAMPAIGNS[slug]
  if (!c) {
    console.error(
      `Missing or unknown --campaign.\nAvailable: ${Object.keys(CAMPAIGNS).join(", ")}`
    )
    process.exit(1)
  }

  const listId = Number(args.list)
  if (!Number.isInteger(listId)) {
    console.error("Missing --list=<id>. Run `npm run brevo:lists` to find it.")
    process.exit(1)
  }

  // Always rebuild from campaigns.mjs so the uploaded HTML cannot drift from
  // the config that is under version control.
  execFileSync("node", ["scripts/build-email.mjs", `--campaign=${slug}`], { stdio: "inherit" })

  const htmlPath = `email/out/${slug}.html`
  if (!existsSync(htmlPath)) {
    console.error(`Build did not produce ${htmlPath}`)
    process.exit(1)
  }

  // The generated HTML uses neutral {{first_name}} so it stays portable.
  // Brevo wants its own contact-attribute syntax, so swap on the way out.
  const html = readFileSync(htmlPath, "utf8").replaceAll(
    "{{first_name}}",
    "{{ contact.FIRSTNAME }}"
  )

  const payload = {
    name: c.name,
    subject: args.subject || c.subject,
    previewText: c.preheader,
    sender: SENDER,
    replyTo: SENDER.email,
    htmlContent: html,
    recipients: { listIds: [listId] },
    inlineImageActivation: false,
    // scheduledAt is intentionally never set. Omitting it is what keeps this
    // a draft. Do not add it here. Scheduling and sending stay a human
    // decision made in the Brevo dashboard.
  }

  console.log(`\nCreating DRAFT "${slug}" (${(html.length / 1024).toFixed(1)}KB) for list ${listId}...`)
  const out = await call("/emailCampaigns", { method: "POST", body: JSON.stringify(payload) })

  console.log(`\nDraft created. Campaign id ${out.id}\n`)
  console.log(`  Subject : ${payload.subject}`)
  console.log(`  From    : ${SENDER.name} <${SENDER.email}>`)
  console.log(`\nThis is a DRAFT. Nothing has been sent.`)
  console.log(`Review, send yourself a test, then send from:`)
  console.log(`  https://app.brevo.com/camp/message/${out.id}`)
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=")
    return [k, v ?? true]
  })
)

if (args.lists) await showLists()
else await createDraft(args)
