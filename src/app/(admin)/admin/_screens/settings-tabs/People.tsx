"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WEEKDAYS } from "@/lib/admin/calendar"
import { ROLES, ROLE_WORDS } from "@/lib/admin/people"
import { EmptyState } from "@/components/blocks/EmptyState"
import type { CapacityKind, PersonRole, Weekday } from "@/lib/admin/types"
import { KIND_PLURALS, type SettingsState } from "../settings-model"
import { addPerson, removePerson, setCapacity, setPersonName, setPersonRole, setPersonText, setSeason, toggleWorkingDay } from "../settings-people"
import { CommitInput, ConfirmButton, TAP_TARGET, type Apply } from "./fields"

// People are rows: who works here, how to reach them, what they are (owner,
// admin, tech), the truck they drive (a person with no truck is not on the
// schedule), the Jobber user their visits go to while Jobber is the field
// display, the days they work, how many visits of each kind fit in their day,
// and the season they work when it is shorter than the year. One table that
// scrolls sideways on a phone. A tech reads it (the screen disables the
// fieldset) and changes nothing.

const DAY_WORDS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" }
const PER_DAY: CapacityKind[] = ["turn-on", "inspection", "blowout", "repair"]
/** The native select and the date input, styled like `Input`. */
const FIELD = "min-h-9 w-full rounded-lg border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"

export function People({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { people } = state.settings
  return (
    <div className="space-y-4">
      {people.length === 0 ? (
        <EmptyState title="No people yet" line="Add a person with a truck and the scheduler has someone to give visits to." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Jobber user</TableHead>
                <TableHead>Working days</TableHead>
                {PER_DAY.map((kind) => (
                  <TableHead key={kind} className="w-24">{`${KIND_PLURALS[kind].replace(/^./, (c) => c.toUpperCase())} per day`}</TableHead>
                ))}
                <TableHead>Season from</TableHead>
                <TableHead>Season to</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="min-w-40 align-top">
                    <CommitInput label={`${person.name} name`} value={person.name} onCommit={(v) => apply((s, a) => setPersonName(s, person.id, v, a))} />
                  </TableCell>
                  <TableCell className="min-w-48 align-top">
                    <CommitInput label={`${person.name} email`} value={person.email ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "email", v, a))} />
                  </TableCell>
                  <TableCell className="min-w-36 align-top">
                    <CommitInput label={`${person.name} phone`} value={person.phone ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "phone", v, a))} />
                  </TableCell>
                  <TableCell className="min-w-28 align-top">
                    <select aria-label={`${person.name} role`} value={person.role} onChange={(e) => apply((s, a) => setPersonRole(s, person.id, e.target.value as PersonRole, a))} className={FIELD}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_WORDS[role]}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="min-w-28 align-top">
                    <CommitInput label={`${person.name} truck`} value={person.truck ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "truck", v, a))} />
                  </TableCell>
                  <TableCell className="min-w-36 align-top">
                    <CommitInput label={`${person.name} Jobber user`} value={person.jobberUserId ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "jobberUserId", v, a))} />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex gap-3 pt-2">
                      {WEEKDAYS.map((day) => {
                        const id = `${person.id}-${day}`
                        return (
                          <div key={day} className="flex flex-col items-center gap-1.5">
                            <Checkbox id={id} className={TAP_TARGET} checked={person.workingDays.includes(day)} onCheckedChange={() => apply((s, a) => toggleWorkingDay(s, person.id, day, a))} />
                            <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
                              {DAY_WORDS[day]}
                              <span className="sr-only">{` for ${person.name}`}</span>
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </TableCell>
                  {PER_DAY.map((kind) => (
                    <TableCell key={kind} className="align-top">
                      <CommitInput
                        type="number"
                        min={0}
                        label={`${person.name} ${KIND_PLURALS[kind]} per day`}
                        value={person.capacityByKind[kind]}
                        onCommit={(v) => apply((s, a) => setCapacity(s, person.id, kind, Number(v), a))}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="min-w-40 align-top">
                    <SeasonInput person={person} field="seasonStart" apply={apply} />
                  </TableCell>
                  <TableCell className="min-w-40 align-top">
                    <SeasonInput person={person} field="seasonEnd" apply={apply} />
                  </TableCell>
                  <TableCell className="align-top">
                    <ConfirmButton
                      label={`Remove ${person.name}`}
                      title={`Remove ${person.name}?`}
                      description="They can no longer sign in and the next schedule run stops giving them visits. Visits already theirs keep their day until you move them."
                      confirm="Remove person"
                      onConfirm={() => apply((s, a) => removePerson(s, person.id, a))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Button variant="outline" onClick={() => apply((s, a) => addPerson(s, a))}>
        <Plus className="size-4" aria-hidden />
        Add person
      </Button>
    </div>
  )
}

/**
 * A season date that can be cleared: a blank commit means "all year", which `CommitInput` would revert, so this
 * one allows it. It keeps `CommitInput`'s draft and seen pair: a date the reducer refuses (an end before the
 * start) snaps back to the date it had, the way every other refused edit on the screen does.
 */
function SeasonInput({ person, field, apply }: { person: SettingsState["settings"]["people"][number]; field: "seasonStart" | "seasonEnd"; apply: Apply }) {
  const label = `${person.name} season ${field === "seasonStart" ? "from" : "to"}`
  const value = person[field] ?? ""
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setDraft(value)
  }
  return (
    <input
      type="date"
      aria-label={label}
      value={draft}
      onChange={(e) => {
        const v = e.target.value
        if (v !== value) apply((s, a) => setSeason(s, person.id, field, v, a))
        setDraft(value)
      }}
      className={FIELD}
    />
  )
}
