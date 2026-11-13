import "server-only"
import NextAuth, { type DefaultSession } from "next-auth"
import Resend from "next-auth/providers/resend"
import { db } from "@/db"
import { authAdapter } from "@/lib/auth/adapter"
import { makeSendVerificationRequest } from "@/lib/auth/send"
import { mayCompleteSignIn, personPrincipal } from "@/lib/auth/session"
import type { PersonPrincipal } from "@/lib/auth/types"
import { readAuthEnv, readOptionalEnv } from "@/lib/env"

declare module "next-auth" {
  interface Session {
    principal?: PersonPrincipal
    user: DefaultSession["user"]
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    principal?: PersonPrincipal
  }
}

/**
 * One Auth.js instance for both kinds of person. The config is a function, so
 * it runs per request and nothing reads the environment or the database at
 * import. JWT sessions: the proxy reads the cookie without a database hop.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const { AUTH_SECRET } = readAuthEnv()
  return {
    secret: AUTH_SECRET,
    trustHost: true,
    adapter: authAdapter(db),
    session: { strategy: "jwt" },
    pages: { signIn: "/account/sign-in", verifyRequest: "/account/sign-in/sent", error: "/account/sign-in" },
    providers: [
      Resend({
        // The send goes through sendEmailNow with the shared RESEND_API_KEY, so this key is never used by Auth.js itself.
        apiKey: readOptionalEnv("RESEND_API_KEY") ?? "unused",
        from: "Trailhead <contact@trailheadirrigation.com>",
        maxAge: 600,
        sendVerificationRequest: makeSendVerificationRequest(),
      }),
    ],
    callbacks: {
      async signIn({ user }) {
        return (await mayCompleteSignIn(db(), user.email)) || "/account/sign-in?error=AccessDenied"
      },
      async jwt({ token, user }) {
        if (user?.email && user.id) {
          const principal = await personPrincipal(db(), user.id, user.email)
          if (principal) token.principal = principal
          else delete token.principal
        }
        return token
      },
      async session({ session, token }) {
        if (token.principal) session.principal = token.principal
        return session
      },
    },
  }
})
