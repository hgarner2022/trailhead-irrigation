// blocks/ and (admin)/ never import marketing sections; sections/ never
// imports blocks/ or (admin)/.
import { importSpecs } from "./walk.mjs"

export function checkImports(file, text, zone, { problems }) {
  for (const spec of importSpecs(text)) {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue
    const segs = spec.split("/")
    if (zone === "app" && segs.includes("sections")) problems.push(`${file}: imports a marketing section (${spec})`)
    if (zone === "marketing" && (segs.includes("blocks") || segs.includes("(admin)")))
      problems.push(`${file}: marketing code imports admin code (${spec})`)
  }
}
