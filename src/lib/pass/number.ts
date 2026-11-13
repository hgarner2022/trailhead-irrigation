/**
 * The next pass number for a season: TH-<season>-NNNN, one past the highest
 * number already issued for that season. Numbers of other seasons and
 * anything that does not parse are ignored. The database's unique
 * (organization_id, number) is the guard if two checkouts race.
 */
export function nextPassNumber(season: number, existing: readonly string[]): string {
  const prefix = `TH-${season}-`
  let highest = 0
  for (const number of existing) {
    if (!number.startsWith(prefix)) continue
    const tail = number.slice(prefix.length)
    if (!/^\d+$/.test(tail)) continue
    highest = Math.max(highest, Number(tail))
  }
  return `${prefix}${String(highest + 1).padStart(4, "0")}`
}
