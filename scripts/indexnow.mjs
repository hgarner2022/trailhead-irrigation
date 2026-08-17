#!/usr/bin/env node
/**
 * Notifies IndexNow-participating search engines that URLs have changed.
 *
 * IndexNow is honored by Bing, Yandex, Naver, Seznam, Yep, and Amazon.
 * Google does NOT participate, so this has no effect on Google indexing.
 * The reason it's worth having: Bing's index is what ChatGPT search draws
 * from, so this gets new and updated pages in front of ChatGPT within
 * minutes instead of waiting on a crawl.
 *
 * Usage:
 *   npm run indexnow -- https://www.trailheadirrigation.com/some-page
 *   npm run indexnow -- --all      # every URL in the live sitemap
 *
 * The key file must stay publicly reachable at KEY_LOCATION. That's how
 * IndexNow verifies domain ownership, so it is meant to be public.
 */

const HOST = "www.trailheadirrigation.com"
const KEY = "05d949ddf67b40018751a4ab76c96010"
const ORIGIN = `https://${HOST}`
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`
const ENDPOINT = "https://api.indexnow.org/indexnow"

async function urlsFromSitemap() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`)
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error(
      "Usage:\n" +
        "  npm run indexnow -- <url> [url ...]\n" +
        "  npm run indexnow -- --all"
    )
    process.exit(1)
  }

  const urlList = args.includes("--all") ? await urlsFromSitemap() : args

  const bad = urlList.filter((u) => !u.startsWith(ORIGIN))
  if (bad.length) {
    console.error(`These URLs are not on ${ORIGIN}:\n  ${bad.join("\n  ")}`)
    process.exit(1)
  }

  // Verify the key file is actually reachable first. If it isn't, IndexNow
  // rejects the whole submission and the error it returns is opaque.
  const keyCheck = await fetch(KEY_LOCATION)
  const keyBody = keyCheck.ok ? (await keyCheck.text()).trim() : ""
  if (keyBody !== KEY) {
    console.error(
      `Key file check failed at ${KEY_LOCATION}\n` +
        `  status: ${keyCheck.status}\n` +
        `  expected body: ${KEY}\n` +
        `  got: ${keyBody || "(empty)"}\n` +
        `Deploy the key file before submitting.`
    )
    process.exit(1)
  }

  console.log(`Submitting ${urlList.length} URL(s) to IndexNow...`)
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  })

  const text = await res.text()
  if (res.ok) {
    console.log(`OK (${res.status}). Submitted:`)
    for (const u of urlList) console.log(`  ${u}`)
    console.log(
      "\nBing typically reflects these within minutes to a few hours.\n" +
        "Reminder: Google does not participate in IndexNow."
    )
  } else {
    console.error(`Failed (${res.status}): ${text || "(no body)"}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
