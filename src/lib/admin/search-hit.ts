import type { RecordKey } from "./record-url"

/** One result of Cmd+K: the record it opens, how it reads in the list, and the page that shows it when the screen has no panel to open it in. */
export interface SearchHit {
  kind: RecordKey
  id: string
  title: string
  detail: string
  href: string
}
