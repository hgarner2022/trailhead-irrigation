// blocks/ and the app route groups ((admin), (checkout), (account), (booking))
// never import marketing sections; sections/ never imports blocks/ or those
// groups. checkServerImports: marketing code (the (site) pages and sections/)
// never imports a server library, so the marketing bundle cannot grow a
// database, Stripe, Jobber API, messaging, scheduling or geocoding dependency.
import { appGroupRe, importSpecs } from "./walk.mjs"

export function checkImports(file, text, zone, { problems }) {
  for (const spec of importSpecs(text)) {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue
    const segs = spec.split("/")
    if (zone === "app" && segs.includes("sections")) problems.push(`${file}: imports a marketing section (${spec})`)
    if (zone === "marketing" && (segs.includes("blocks") || segs.some((s) => appGroupRe.test(s))))
      problems.push(`${file}: marketing code imports admin code (${spec})`)
  }
}

// Path segments that mark a server library. `jobber-api` is the server folder;
// the existing src/lib/jobber.ts (form ids) is a marketing module and stays allowed.
const SERVER_SEGMENTS = new Set(["db", "api", "jobber-api", "stripe", "messaging", "scheduling", "geocode"])

export function checkServerImports(file, text, { problems }) {
  for (const spec of importSpecs(text)) {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue
    const segs = spec.split("/")
    const passServer = segs.some((s, i) => s === "pass" && segs[i + 1] === "server")
    if (passServer || segs.some((s) => SERVER_SEGMENTS.has(s)))
      problems.push(`${file}: marketing code imports a server library (${spec})`)
  }
}
