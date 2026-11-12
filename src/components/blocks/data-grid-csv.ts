// CSV for the DataGrid export: the visible columns as the header row, then one
// line per visible row, CRLF line ends (RFC 4180) so Excel and Numbers open it
// without asking. `rowsToCsv` is pure; `downloadCsv` touches the DOM and is only
// ever called from the export button's click handler.

export interface CsvColumn {
  id: string
  header: string
}

function quote(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function rowsToCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map((c) => quote(c.header)), ...rows.map((row) => columns.map((c) => quote(row[c.id])))]
  return lines.map((cells) => cells.join(",")).join("\r\n") + "\r\n"
}

/** Hands the browser `<name>.csv` to save. */
export function downloadCsv(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `${name}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
