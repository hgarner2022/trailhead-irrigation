// Every .ts/.tsx under blocks/, ui/ and the (admin), (checkout) and (account)
// route groups stays at or under FILE_CAP lines; stories and tests are exempt.
export const FILE_CAP = 300

// shadcn files that ship over the cap. Reported as a note, never failed.
export const FILE_CAP_ALLOWLIST = new Set(["ui/sidebar.tsx", "ui/chart.tsx"])

export function checkFileSize(text, { file, dirs, name, fixture, gated }, { problems, notes }) {
  if (!gated || fixture) return
  const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0)
  if (lines <= FILE_CAP) return
  if (FILE_CAP_ALLOWLIST.has(`${dirs.at(-1)}/${name}`)) notes.push(`${file}: ${lines} lines, allowlisted (shadcn file)`)
  else problems.push(`${file}: ${lines} lines (limit ${FILE_CAP}); split it or add it to FILE_CAP_ALLOWLIST`)
}
