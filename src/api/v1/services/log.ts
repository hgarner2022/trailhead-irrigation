import "server-only"
import type * as s from "@/db/schema"
import type { Leaf } from "../settings/log"

// A service's edits as change log words, one leaf per changed field, named the way the Settings screen names them
// ("Spring turn-on price", "Fall blowout bookable to"), so the log reads the same whichever side wrote the line.

type Row = typeof s.service.$inferSelect
const text = (v: string | null) => v || "None"
const money = (v: number | null) => (v === null ? "None" : `$${v}`)
const yes = (v: boolean) => (v ? "Yes" : "No")
const online = (r: Row) => (r.quoteOnly ? "We quote" : r.bookable ? "Book a day" : "Off")
const date = (v: string | null) => v || "All year"

export function serviceLeaves(before: Row, after: Row): Leaf[] {
  const leaves: Leaf[] = []
  const add = (field: string, from: string, to: string) => {
    if (from !== to) leaves.push({ field: `${before.name} ${field}`, from, to })
  }
  add("name", before.name, after.name)
  add("what's included", text(before.description), text(after.description))
  add("price", money(before.price), money(after.price))
  add("included zones", String(before.includedZones ?? "None"), String(after.includedZones ?? "None"))
  add("per extra zone", money(before.extraZonePrice), money(after.extraZonePrice))
  add("minutes", String(before.slotMinutes), String(after.slotMinutes))
  add("online", online(before), online(after))
  add("taxable", yes(before.taxable), yes(after.taxable))
  add("active", yes(before.active), yes(after.active))
  add("bookable from", date(before.bookableFrom), date(after.bookableFrom))
  add("bookable to", date(before.bookableTo), date(after.bookableTo))
  return leaves
}
