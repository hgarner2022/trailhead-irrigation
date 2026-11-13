"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WEEKDAYS } from "@/components/blocks/week-grid-days"
import { EmptyState } from "@/components/blocks/EmptyState"
import type { CapacityKind, Weekday } from "@/lib/admin/types"
import { KIND_PLURALS, addTruck, removeTruck, setCapacity, setJobberUser, setTruckName, toggleWorkingDay, type SettingsState } from "../settings-model"
import { CommitInput, ConfirmButton, type Apply } from "./fields"

// Trucks are rows: a name, the Jobber user its visits go to while Jobber is
// the field display, the days it works and how many visits of each kind fit
// in its day. One table that scrolls sideways on a phone.

const DAY_WORDS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" }
const PER_DAY: CapacityKind[] = ["turn-on", "inspection", "blowout", "repair"]

export function Trucks({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { trucks } = state.settings
  return (
    <div className="space-y-4">
      {trucks.length === 0 ? (
        <EmptyState title="No trucks yet" line="Add a truck and the scheduler has somewhere to put visits." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Jobber user</TableHead>
                <TableHead>Working days</TableHead>
                {PER_DAY.map((kind) => (
                  <TableHead key={kind} className="w-24">{`${KIND_PLURALS[kind].replace(/^./, (c) => c.toUpperCase())} a day`}</TableHead>
                ))}
                <TableHead className="w-24">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((truck) => (
                <TableRow key={truck.id}>
                  <TableCell className="min-w-40 align-top">
                    <CommitInput label={`${truck.name} name`} value={truck.name} onCommit={(v) => apply((s, a) => setTruckName(s, truck.id, v, a))} />
                  </TableCell>
                  <TableCell className="min-w-40 align-top">
                    <CommitInput label={`${truck.name} Jobber user`} value={truck.jobberUserId ?? ""} onCommit={(v) => apply((s, a) => setJobberUser(s, truck.id, v, a))} />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex gap-3 pt-2">
                      {WEEKDAYS.map((day) => {
                        const id = `${truck.id}-${day}`
                        return (
                          <div key={day} className="flex flex-col items-center gap-1.5">
                            <Checkbox id={id} checked={truck.workingDays.includes(day)} onCheckedChange={() => apply((s, a) => toggleWorkingDay(s, truck.id, day, a))} />
                            <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
                              {DAY_WORDS[day]}
                              <span className="sr-only">{` for ${truck.name}`}</span>
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
                        label={`${truck.name} ${KIND_PLURALS[kind]} per day`}
                        value={truck.capacityByKind[kind]}
                        onCommit={(v) => apply((s, a) => setCapacity(s, truck.id, kind, Number(v), a))}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="align-top">
                    <ConfirmButton
                      label={`Remove ${truck.name}`}
                      title={`Remove ${truck.name}?`}
                      description="The next schedule run stops planning visits onto this truck. Visits already on it keep their day until you move them."
                      confirm="Remove truck"
                      onConfirm={() => apply((s, a) => removeTruck(s, truck.id, a))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Button variant="outline" onClick={() => apply((s, a) => addTruck(s, a))}>
        <Plus className="size-4" aria-hidden />
        Add truck
      </Button>
    </div>
  )
}
