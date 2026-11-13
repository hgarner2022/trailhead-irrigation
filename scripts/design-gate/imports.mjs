// blocks/ and the app route groups ((admin), (checkout), (account)) never
// import marketing sections; sections/ never imports blocks/ or those groups.
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
