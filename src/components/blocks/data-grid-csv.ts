// CSV for the DataGrid export: the visible columns as the header row, then one
// line per visible row, CRLF line ends (RFC 4180) so Excel and Numbers open it
// without asking. `rowsToCsv` is pure; `downloadCsv` touches the DOM and is only
// ever called from the export button's click handler.

export interface CsvColumn {
  id: string
  header: string
}

// A spreadsheet runs a cell that starts like a formula, and a leading tab or
// carriage return can smuggle one in. A leading quote keeps it text; numbers
// are left alone so a negative amount stays a number. Excel shows the quote
// literally for values like phone numbers, which is the accepted cost.
const FORMULA = /^[=+\-@\t\r]/

function quote(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value)
  if (typeof value !== "number" && FORMULA.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function rowsToCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map((c) => quote(c.header)), ...rows.map((row) => columns.map((c) => quote(row[c.id])))]
  return lines.map((cells) => cells.join(",")).join("\r\n") + "\r\n"
}

/** Hands the browser `<name>.csv` to save, with a byte order mark so Excel reads it as UTF-8. */
export function downloadCsv(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `${name}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked after the browser has started the download, not before.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
