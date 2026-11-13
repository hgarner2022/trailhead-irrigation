import { sql, type AnyColumn, type SQL } from "drizzle-orm"
import { z } from "zod"

export const pageInput = {
  limit: z.coerce.number().int().min(1).max(100).default(25).describe("Rows per page, 1 to 100."),
  cursor: z.string().optional().describe("The `next_cursor` of the previous page."),
}

export const page = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), next_cursor: z.string().nullable().describe("Pass as `cursor` for the next page; null on the last page.") })

export interface Page<T> {
  data: T[]
  next_cursor: string | null
}

/** Rows fetched with `limit + 1`: the extra row says there is another page; the cursor is made from the last row kept. */
export function cursorPage<T>(rows: T[], limit: number, cursorOf: (row: T) => string): Page<T> {
  if (rows.length <= limit) return { data: rows, next_cursor: null }
  const data = rows.slice(0, limit)
  return { data, next_cursor: cursorOf(data[data.length - 1]!) }
}

/** A cursor for rows ordered by (created_at desc, id desc). */
export const timeCursor = (row: { createdAt: Date; id: string }) => `${row.createdAt.toISOString()}|${row.id}`

/** The WHERE fragment for the rows after a `timeCursor`; undefined for the first page or a cursor that does not parse. */
export function afterTimeCursor(createdAt: AnyColumn, id: AnyColumn, cursor: string | undefined): SQL | undefined {
  if (!cursor) return undefined
  const [at, rowId] = cursor.split("|")
  if (!at || !rowId || Number.isNaN(Date.parse(at))) return undefined
  return sql`(${createdAt}, ${id}) < (${at}::timestamptz, ${rowId})`
}
