import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { gateFor } from "@/lib/auth/gate"
import type { Principal } from "@/lib/auth/types"

// Next 16's proxy (the old middleware). It gates /admin and /account on the
// session cookie and hands server components the path in `x-pathname`. Every
// page still guards itself (src/lib/auth/guard.ts); this only saves the trip.
// It reads the JWT straight from the cookie with next-auth/jwt rather than
// through the Auth.js `auth()` wrapper: the wrapper pulls the whole auth
// config, and with it the database, into the proxy bundle, where it failed
// at runtime on the first deploy (every /admin and /account page was a 500).
// The proxy therefore never touches the database and needs only AUTH_SECRET.

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const secret = process.env.AUTH_SECRET
  const token = secret ? await getToken({ req: request, secret, secureCookie: request.nextUrl.protocol === "https:" }) : null
  const principal = (token?.principal as Principal | undefined) ?? null
  const gate = gateFor(pathname, principal)
  if (gate.action === "redirect") {
    const url = new URL(gate.to, request.nextUrl)
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }
  const headers = new Headers(request.headers)
  headers.set("x-pathname", pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ["/admin/:path*", "/account/:path*"] }
