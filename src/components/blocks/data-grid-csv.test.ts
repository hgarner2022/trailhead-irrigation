import { describe, it, expect } from "vitest"
import { rowsToCsv } from "./data-grid-csv"

const columns = [
  { id: "firstName", header: "Name" },
  { id: "town", header: "Town" },
  { id: "zones", header: "Zones" },
]

describe("rowsToCsv", () => {
  it("writes the header row first and ends every line with CRLF", () => {
    const csv = rowsToCsv(columns, [{ firstName: "Andrea", town: "Erie", zones: 6 }])
    expect(csv).toBe("Name,Town,Zones\r\nAndrea,Erie,6\r\n")
  })

  it("writes only the columns it is given, in that order", () => {
    const csv = rowsToCsv([columns[1], columns[0]], [{ firstName: "Andrea", town: "Erie", zones: 6 }])
    expect(csv).toBe("Town,Name\r\nErie,Andrea\r\n")
  })

  it("quotes values with commas, quotes or newlines and doubles the quotes", () => {
    const csv = rowsToCsv(columns, [{ firstName: 'Ann "Annie" Lee', town: "Erie, CO", zones: "6\n7" }])
    expect(csv).toBe('Name,Town,Zones\r\n"Ann ""Annie"" Lee","Erie, CO","6\n7"\r\n')
  })

  it("quotes a header that needs it", () => {
    const csv = rowsToCsv([{ id: "charged", header: "Charged, so far" }], [{ charged: 145 }])
    expect(csv).toBe('"Charged, so far"\r\n145\r\n')
  })

  it("writes null and undefined as empty cells and keeps zero", () => {
    const csv = rowsToCsv(columns, [{ firstName: null, town: undefined, zones: 0 }])
    expect(csv).toBe("Name,Town,Zones\r\n,,0\r\n")
  })

  it("writes just the header when there are no rows", () => {
    expect(rowsToCsv(columns, [])).toBe("Name,Town,Zones\r\n")
  })
})
