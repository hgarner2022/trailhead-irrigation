import type { RecordKey } from "./record-url"

/** One result of Cmd+K: the record it opens, how it reads in the list, and the page that shows it when the screen has no panel to open it in. */
export interface SearchHit {
  /** "request" is a held request (New or Seen), "quote" a quote and "invoice" an invoice, each found by its number or its customer: each opens its own page, never a record host */
  kind: RecordKey | "request" | "quote" | "invoice"
  id: string
  title: string
  detail: string
  href: string
  /** a customer's phone and email, so two people with one name are told apart */
  contact?: string
  /** the last line of a group that has more than it shows: it goes to the full list instead of opening a record */
  seeAll?: boolean
}
