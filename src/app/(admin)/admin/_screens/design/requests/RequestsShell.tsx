"use client"

import type { ReactNode } from "react"
import { AdminShell, type AdminSection } from "@/components/blocks/AdminShell"
import type { SearchHit } from "@/lib/admin/search-hit"
import { newCount, REQUEST_FIXTURES, fullName, serviceWords, stateOf, type RequestData } from "./request-model"

// The shell the Requests stories sit in: the real AdminShell with `requests` set, so the rail draws Requests after Schedule with the count of new
// requests and a phone's More holds it. The count is read from the requests the story shows.

export const SHELL_USER = { initials: "HG", name: "Hannah" }

/** Cmd+K over the requests that are still waiting (New and Seen), by name, street, phone, email or service. */
export const searchRequests =
  (list: readonly RequestData[] = REQUEST_FIXTURES) =>
  async (query: string): Promise<SearchHit[]> => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, "")
    return list
      .filter((r) => !r.becameJob && ["new", "seen"].includes(stateOf(r)))
      .filter((r) => `${fullName(r)} ${r.street} ${r.email} ${r.service}`.toLowerCase().includes(q) || (digits.length >= 3 && r.phone.replace(/\D/g, "").includes(digits)))
      .map((r) => ({ kind: "request" as const, id: r.id, title: fullName(r), detail: [serviceWords(r), r.town].filter((x) => x !== "Not said" && x).join(" · "), href: `/admin/requests?request=${r.id}`, contact: r.phone }))
  }

export function RequestsShell({ children, list = REQUEST_FIXTURES, current = "requests", defaultSearchOpen, defaultSearchQuery }: { children: ReactNode; list?: readonly RequestData[]; current?: AdminSection; defaultSearchOpen?: boolean; defaultSearchQuery?: string }) {
  return (
    <AdminShell current={current} user={SHELL_USER} requests={{ count: newCount(list) }} onSearch={searchRequests(list)} defaultSearchOpen={defaultSearchOpen} defaultSearchQuery={defaultSearchQuery}>
      {children}
    </AdminShell>
  )
}
