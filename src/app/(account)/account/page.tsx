import { redirect } from "next/navigation"

/**
 * Where "your Trailhead account" in every text and email points. Until the account Home from the portal design
 * (docs/plans/2026-11-18-customer-portal-design.md) is built, it opens the Season Pass page; the sign-in guard in
 * `src/lib/auth/gate.ts` has already sent a signed-out visitor to the sign-in page.
 */
export default function AccountHome() {
  redirect("/account/pass")
}
