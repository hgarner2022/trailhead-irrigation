import { describe, expect, it } from "vitest"
import type { GridCardSlots } from "@/components/blocks/DataGridCard"
import { columnId, type GridColumnDef } from "@/components/blocks/data-grid-table"
import { customerCard, customerColumns } from "./customers-columns"
import { jobCard, jobColumns } from "./jobs-columns"
import { visitCard, visitColumns } from "./visits-columns"

// Each screen's card names columns of its own grid; a typo would leave a card without its status or money word.
const ids = (card: GridCardSlots) => [card.title, ...(card.line ?? []), card.state, ...(card.when ?? []), card.money].filter((id): id is string => Boolean(id))

describe("the screens' phone cards", () => {
  const cases: [string, GridCardSlots, GridColumnDef<never>[]][] = [
    ["Jobs", jobCard, jobColumns as GridColumnDef<never>[]],
    ["Customers", customerCard, customerColumns as GridColumnDef<never>[]],
    ["Schedule List", visitCard, visitColumns as GridColumnDef<never>[]],
  ]
  it.each(cases)("%s only names columns of its grid, with its first column as the title", (_name, card, columns) => {
    const known = columns.map((c) => columnId(c))
    for (const id of ids(card)) expect(known).toContain(id)
    expect(card.title).toBe(known[0])
  })
  it("Jobs carries status, next and money; Customers the next day and unpaid; the List who and the day", () => {
    expect(jobCard).toMatchObject({ state: "stage", when: ["next"], money: "money" })
    expect(customerCard).toMatchObject({ when: ["nextKey"], money: "unpaid" })
    expect(visitCard.when).toEqual(["day", "time", "personId"])
    expect(visitCard.money).toBe("money")
  })
})
