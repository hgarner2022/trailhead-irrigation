/** The season a day belongs to: the calendar year through October, the next year from November (wiring plan, decision 15). `today` is YYYY-MM-DD, Mountain time. */
export function currentSeason(today: string): number {
  const year = Number(today.slice(0, 4))
  return Number(today.slice(5, 7)) >= 11 ? year + 1 : year
}
