"use client"

import type { ReactNode } from "react"
import type { AdminSection } from "@/components/blocks/AdminShell"
import { DesignShell } from "../DesignShell"
import { REQUEST_FIXTURES, type RequestData } from "./request-model"

// The shell the Requests stories sit in: the one `DesignShell` (the nine items in their one order, Search), with the requests the story shows,
// so the count of new requests and Cmd+K's Requests group are read from them.

export { SHELL_USER } from "../DesignShell"
export { searchRequests } from "./request-search"

export function RequestsShell({ children, list = REQUEST_FIXTURES, current = "requests", defaultSearchOpen, defaultSearchQuery }: { children: ReactNode; list?: readonly RequestData[]; current?: AdminSection; defaultSearchOpen?: boolean; defaultSearchQuery?: string }) {
  return (
    <DesignShell current={current} requests={list} defaultSearchOpen={defaultSearchOpen} defaultSearchQuery={defaultSearchQuery}>
      {children}
    </DesignShell>
  )
}
