import { describe, expect, it } from "vitest"
import { cursorPage, timeCursor } from "./pagination"

const row = (n: number) => ({ id: `r${n}`, createdAt: new Date(Date.UTC(2027, 0, n)) })

describe("cursorPage", () => {
  const cursor = timeCursor
  it("returns a page of two with a cursor from the last row kept", () => {
    const page = cursorPage([row(3), row(2), row(1)], 2, cursor)
    expect(page.data.map((r) => r.id)).toEqual(["r3", "r2"])
    expect(page.next_cursor).toBe("2027-01-02T00:00:00.000Z|r2")
  })
  it("ends with a null cursor on the last page", () => {
    expect(cursorPage([row(1)], 2, cursor)).toEqual({ data: [row(1)], next_cursor: null })
    expect(cursorPage([row(2), row(1)], 2, cursor).next_cursor).toBeNull()
  })
})
