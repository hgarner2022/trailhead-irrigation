import "server-only"
import { ROLE_WORDS } from "@/lib/admin/people"
import type { Leaf } from "../settings/log"
import type { PersonRow } from "./handlers"

// A person's edits as change log words, one leaf per changed field, named the way the Settings screen names them
// ("Ryan Garner name", "Tech Two truck") so the log reads the same whichever side wrote the line.

const DAYS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as const
const KINDS = { "turn-on": "turn-ons", inspection: "inspections", blowout: "blowouts", repair: "repairs", other: "other visits" } as const
const text = (value: string | null) => value || "None"

export function personLeaves(before: PersonRow, after: PersonRow): Leaf[] {
  const who = before.name
  const leaves: Leaf[] = []
  const add = (field: string, from: string, to: string) => {
    if (from !== to) leaves.push({ field: `${who} ${field}`, from, to })
  }
  add("name", before.name, after.name)
  add("email", text(before.email), text(after.email))
  add("phone", text(before.phone), text(after.phone))
  add("role", ROLE_WORDS[before.role], ROLE_WORDS[after.role])
  add("truck", text(before.truck), text(after.truck))
  add("Jobber user", text(before.jobberUserId), text(after.jobberUserId))
  add("working days", before.workingDays.map((d) => DAYS[d]).join(", "), after.workingDays.map((d) => DAYS[d]).join(", "))
  for (const kind of Object.keys(KINDS) as (keyof typeof KINDS)[]) add(`${KINDS[kind]} per day`, String(before.capacityByKind[kind]), String(after.capacityByKind[kind]))
  add("season from", before.seasonStart || "All year", after.seasonStart || "All year")
  add("season to", before.seasonEnd || "All year", after.seasonEnd || "All year")
  return leaves
}
