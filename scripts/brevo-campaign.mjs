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

import { readFileSync, existsSync } from "node:fs"

const API = "https://api.brevo.com/v3"

const DEFAULTS = {
  html: "email/blowout-existing-customers.html",
  name: "Blowout 2026 - existing customers",
  subject: "Sorry to bring this up while it's 90 out",
  preheader: "October fills up fast. Pick your date while it is still open.",
  senderName: "Ryan at Trailhead",
  senderEmail: "ryan@trailheadirrigation.com",
  replyTo: "ryan@trailheadirrigation.com",
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

function key() {
  loadEnvLocal()
  const k = process.env.BREVO_API_KEY
  if (!k) {
    console.error(
      "BREVO_API_KEY is not set.\n\n" +
        "Add it to .env.local in the project root:\n" +
        "  BREVO_API_KEY=xkeysib-your-key-here\n\n" +
        "Get one at Brevo > top-right menu > SMTP & API > API Keys.\n" +
        ".env.local is gitignored, so the key stays off GitHub."
    )
    process.exit(1)
  }
  return k
}

async function call(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      "api-key": key(),
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
  const htmlPath = args.html || DEFAULTS.html
  if (!existsSync(htmlPath)) {
    console.error(`HTML file not found: ${htmlPath}`)
    process.exit(1)
  }

  // The source HTML uses neutral {{first_name}} so it stays portable across
  // platforms. Brevo wants its own contact-attribute syntax, so swap on the
  // way out rather than locking the file to one vendor.
  let html = readFileSync(htmlPath, "utf8").replaceAll(
    "{{first_name}}",
    "{{ contact.FIRSTNAME }}"
  )

  const listId = Number(args.list)
  if (!Number.isInteger(listId)) {
    console.error("Missing --list=<id>. Run `npm run brevo:lists` to find it.")
    process.exit(1)
  }

  const payload = {
    name: args.name || DEFAULTS.name,
    subject: args.subject || DEFAULTS.subject,
    previewText: DEFAULTS.preheader,
    sender: { name: DEFAULTS.senderName, email: DEFAULTS.senderEmail },
    replyTo: DEFAULTS.replyTo,
    htmlContent: html,
    recipients: { listIds: [listId] },
    inlineImageActivation: false,
    // scheduledAt is intentionally never set. Omitting it is what keeps this
    // a draft. Do not add it here; schedule or send from the dashboard so a
    // human always makes that call.
  }

  console.log(`Creating DRAFT campaign from ${htmlPath} (${(html.length / 1024).toFixed(1)}KB)...`)
  const out = await call("/emailCampaigns", { method: "POST", body: JSON.stringify(payload) })

  console.log(`\nDraft created. Campaign id ${out.id}\n`)
  console.log(`  Subject : ${payload.subject}`)
  console.log(`  From    : ${payload.sender.name} <${payload.sender.email}>`)
  console.log(`  List    : ${listId}`)
  console.log(`\nIt is a DRAFT and has not been sent.`)
  console.log(`Review it here, send a test to yourself, then send:`)
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
