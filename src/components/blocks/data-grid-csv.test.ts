import { describe, it, expect, vi, afterEach } from "vitest"
import { downloadCsv, rowsToCsv } from "./data-grid-csv"

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

describe("rowsToCsv against formula injection", () => {
  it("prefixes a text cell that starts like a formula with a quote", () => {
    const rows = [
      { firstName: "=SUM(A1:A9)", town: "+Erie", zones: "-7" },
      { firstName: "@import", town: "Erie", zones: 6 },
    ]
    expect(rowsToCsv(columns, rows)).toBe("Name,Town,Zones\r\n'=SUM(A1:A9),'+Erie,'-7\r\n'@import,Erie,6\r\n")
  })

  it("prefixes a cell that starts with a tab or a carriage return", () => {
    expect(rowsToCsv([{ id: "note", header: "Note" }], [{ note: "\t=1" }, { note: "\r=2" }])).toBe("Note\r\n'\t=1\r\n\"'\r=2\"\r\n")
  })

  it("leaves a negative number alone", () => {
    expect(rowsToCsv([{ id: "delta", header: "Delta" }], [{ delta: -50 }])).toBe("Delta\r\n-50\r\n")
  })

  it("still quotes a prefixed cell that needs quoting", () => {
    expect(rowsToCsv([{ id: "note", header: "Note" }], [{ note: "=1,2" }])).toBe('Note\r\n"\'=1,2"\r\n')
  })
})

describe("downloadCsv", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("saves a UTF-8 file with a byte order mark, through an anchor that is in the document while it is clicked", async () => {
    vi.useFakeTimers()
    let blob: Blob | undefined
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
      blob = b as Blob
      return "blob:passes"
    })
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    let attachedWhenClicked = false
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      attachedWhenClicked = document.body.contains(this)
    })
    downloadCsv("passes", "Name\r\nAndrea\r\n")
    expect(click).toHaveBeenCalledTimes(1)
    expect(attachedWhenClicked).toBe(true)
    expect(document.querySelector("a[download]")).toBeNull()
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe("passes.csv")
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith("blob:passes")
    vi.useRealTimers()
    // TextDecoder strips a leading BOM, so read the bytes.
    const bytes = new Uint8Array(await blob!.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes)).toBe("Name\r\nAndrea\r\n")
  })
})
