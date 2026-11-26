import type { SearchHit } from "@/lib/admin/search-hit"
import { REQUEST_FIXTURES, fullName, serviceWords, stateOf, type RequestData } from "./request-model"

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
