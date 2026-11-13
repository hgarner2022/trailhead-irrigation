import "server-only"
import type { Database } from "@/db/types"
import { findPerson } from "./people"
import type { PersonPrincipal } from "./types"

/**
 * The principal a sign-in carries in the JWT: who the email is, which
 * organization and (for an admin) which role, re-read from the allow-list so a
 * removed admin loses access the next time they sign in.
 */
export async function personPrincipal(db: Database, userId: string, email: string): Promise<PersonPrincipal | null> {
  const person = await findPerson(db, email)
  if (!person) return null
  const { classification, organizationId } = person
  return {
    kind: "person",
    id: userId,
    email: email.toLowerCase(),
    organizationId,
    type: classification.kind,
    ...(classification.kind === "admin" ? { role: classification.role } : { customerId: classification.customerId }),
  }
}

/** The sign-in callback's rule: only an email on the allow-list may receive or use a link. */
export async function mayCompleteSignIn(db: Database, email: string | null | undefined): Promise<boolean> {
  return !!email && (await findPerson(db, email)) !== null
}
