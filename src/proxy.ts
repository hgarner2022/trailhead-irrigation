import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { gateFor } from "@/lib/auth/gate"

// Next 16's proxy (the old middleware). It gates /admin and /account on the
// session cookie and hands server components the path in `x-pathname`. Every
// page still guards itself (src/lib/auth/guard.ts); this only saves the trip.
export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl
  const gate = gateFor(pathname, request.auth?.principal)
  if (gate.action === "redirect") {
    const url = new URL(gate.to, request.nextUrl)
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }
  const headers = new Headers(request.headers)
  headers.set("x-pathname", pathname)
  return NextResponse.next({ request: { headers } })
})

export const config = { matcher: ["/admin/:path*", "/account/:path*"] }
