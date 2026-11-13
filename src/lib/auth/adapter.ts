import "server-only"
import { and, eq, sql } from "drizzle-orm"
import type { Adapter, AdapterUser } from "next-auth/adapters"
import type { Database } from "@/db/types"
import * as s from "@/db/schema"
import { findPerson } from "./people"

type UserRow = typeof s.authUser.$inferSelect

const toAdapterUser = (row: UserRow): AdapterUser => ({
  id: row.id,
  email: row.email,
  emailVerified: row.emailVerified,
  name: row.name,
  image: row.image,
})

/**
 * The small Auth.js adapter the magic link needs, over our own `auth_*`
 * tables. Every row carries `organization_id`, which the stock adapter cannot
 * supply, so the organization comes from the allow-list row the email matches
 * (an admin or a customer on file). A stranger never gets a row: the sign-in
 * callback refuses them before a token is created.
 */
export function authAdapter(getDb: () => Database): Adapter {
  return {
    async createUser(user) {
      const db = getDb()
      const person = await findPerson(db, user.email)
      if (!person) throw new Error("AccessDenied")
      const { classification, organizationId } = person
      const [row] = await db
        .insert(s.authUser)
        .values({
          organizationId,
          email: user.email.toLowerCase(),
          emailVerified: user.emailVerified,
          name: user.name,
          image: user.image,
          role: classification.kind,
          customerId: classification.kind === "customer" ? classification.customerId : null,
        })
        .returning()
      return toAdapterUser(row!)
    },
    async getUser(id) {
      const [row] = await getDb().select().from(s.authUser).where(eq(s.authUser.id, id))
      return row ? toAdapterUser(row) : null
    },
    async getUserByEmail(email) {
      const [row] = await getDb()
        .select()
        .from(s.authUser)
        .where(sql`lower(${s.authUser.email}) = ${email.trim().toLowerCase()}`)
      return row ? toAdapterUser(row) : null
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const db = getDb()
      const [row] = await db
        .select({ user: s.authUser })
        .from(s.authAccount)
        .innerJoin(s.authUser, eq(s.authUser.id, s.authAccount.userId))
        .where(and(eq(s.authAccount.provider, provider), eq(s.authAccount.providerAccountId, providerAccountId)))
      return row ? toAdapterUser(row.user) : null
    },
    async updateUser(user) {
      const [row] = await getDb()
        .update(s.authUser)
        .set({
          ...(user.emailVerified !== undefined && { emailVerified: user.emailVerified }),
          ...(user.name !== undefined && { name: user.name }),
          ...(user.image !== undefined && { image: user.image }),
        })
        .where(eq(s.authUser.id, user.id))
        .returning()
      return toAdapterUser(row!)
    },
    async createVerificationToken({ identifier, token, expires }) {
      const db = getDb()
      const person = await findPerson(db, identifier)
      if (!person) throw new Error("AccessDenied")
      await db
        .insert(s.authVerificationToken)
        .values({ organizationId: person.organizationId, identifier, token, expires })
      return { identifier, token, expires }
    },
    async useVerificationToken({ identifier, token }) {
      const [row] = await getDb()
        .delete(s.authVerificationToken)
        .where(and(eq(s.authVerificationToken.identifier, identifier), eq(s.authVerificationToken.token, token)))
        .returning()
      return row ? { identifier: row.identifier, token: row.token, expires: row.expires } : null
    },
  }
}
