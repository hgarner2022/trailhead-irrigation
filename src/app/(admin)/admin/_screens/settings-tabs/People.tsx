"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormRow } from "@/components/blocks/FormRow"
import { SettingsList } from "@/components/blocks/SettingsList"
import { TimeField } from "@/components/blocks/TimeField"
import { WEEKDAYS } from "@/lib/admin/calendar"
import { ROLES, ROLE_WORDS, hoursOf } from "@/lib/admin/people"
import type { CapacityKind, Person, PersonRole, Weekday } from "@/lib/admin/types"
import { KIND_PLURALS, MAX_CAPACITY, type SettingsState } from "../settings-model"
import { addPerson, removePerson, setCapacity, setHours, setPersonName, setPersonRole, setPersonText, setTakesVisits, toggleWorkingDay } from "../settings-people"
import { CommitInput, ConfirmButton, TAP_TARGET, type Apply } from "./fields"
import { SelectField } from "@/components/blocks/SelectField"

// People are rows of a SettingsList: who works here, how to reach them, what they are (owner, admin, tech), whether they take visits
// (a person who does is a row on the Schedule; one who does not, an office admin, is here and nowhere else), the days and hours they
// work and the most of each kind they take in a day. The Jobber user their visits go to while Jobber is the field display and the
// schedule label sit under Advanced. A person's season (the old "Season from" and "Season to") is not shown: the columns stay for the
// engine step. A tech reads it (the screen disables the fieldset) and changes nothing.

const DAY_WORDS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" }
const PER_DAY: CapacityKind[] = ["turn-on", "inspection", "blowout", "repair"]
/** The native select, styled like `Input`. */

function PersonFacts({ person, apply }: { person: Person; apply: Apply }) {
  const { name } = person
  const hours = hoursOf(person)
  return (
    <>
      <FormRow label="Name" inline>
        <CommitInput label={`${name} name`} value={name} onCommit={(v) => apply((s, a) => setPersonName(s, person.id, v, a))} />
      </FormRow>
      <FormRow label="Email" inline hint="How they sign in">
        <CommitInput label={`${name} email`} value={person.email ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "email", v, a))} />
      </FormRow>
      <FormRow label="Phone" inline>
        <CommitInput label={`${name} phone`} value={person.phone ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "phone", v, a))} />
      </FormRow>
      <FormRow label="Role" inline>
        <SelectField density="compact" aria-label={`${name} role`} value={person.role} onChange={(e) => apply((s, a) => setPersonRole(s, person.id, e.target.value as PersonRole, a))}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_WORDS[role]}
            </option>
          ))}
        </SelectField>
      </FormRow>
      <FormRow label="Takes visits" inline hint="On the Schedule, with a row of their own">
        <Checkbox className={`mt-2.5 ${TAP_TARGET}`} aria-label={`${name} takes visits`} checked={Boolean(person.truck)} onCheckedChange={(v) => apply((s, a) => setTakesVisits(s, person.id, v === true, a))} />
      </FormRow>
      <FormRow label="Working days" inline htmlFor={`${person.id}-mon`}>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <Checkbox id={`${person.id}-${day}`} className={TAP_TARGET} aria-label={`${DAY_WORDS[day]} for ${name}`} checked={person.workingDays.includes(day)} onCheckedChange={() => apply((s, a) => toggleWorkingDay(s, person.id, day, a))} />
              <span aria-hidden className="text-xs font-normal text-muted-foreground">
                {DAY_WORDS[day]}
              </span>
            </div>
          ))}
        </div>
      </FormRow>
      <FormRow label="Hours" inline className="lg:col-span-2" htmlFor={`${person.id}-hours-start`} hint="The weekly rule. A day off or a dentist visit is Block time on the Schedule.">
        <div className="flex items-center gap-2">
          <TimeField id={`${person.id}-hours-start`} label={`${name} day starts`} value={hours.start} onChange={(v) => apply((s, a) => setHours(s, person.id, "hoursStart", v, a))} />
          <span className="text-sm text-muted-foreground">to</span>
          <TimeField label={`${name} day ends`} value={hours.end} onChange={(v) => apply((s, a) => setHours(s, person.id, "hoursEnd", v, a))} />
        </div>
      </FormRow>
      <FormRow label="Most per day, by kind" inline className="lg:col-span-2" htmlFor={`${person.id}-most-turn-on`} hint="The most of each kind in one day. 0 means this person takes none of that kind.">
        <div className="grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
          {PER_DAY.map((kind) => (
            <div key={kind} className="min-w-0 space-y-1">
              <span aria-hidden className="block text-xs text-muted-foreground">
                {KIND_PLURALS[kind].replace(/^./, (c) => c.toUpperCase())}
              </span>
              <CommitInput
                id={kind === "turn-on" ? `${person.id}-most-turn-on` : undefined}
                type="number"
                min={0}
                max={MAX_CAPACITY}
                label={`${name} most ${KIND_PLURALS[kind]} per day`}
                value={person.capacityByKind[kind]}
                onCommit={(v) => apply((s, a) => setCapacity(s, person.id, kind, Number(v), a))}
              />
            </div>
          ))}
        </div>
      </FormRow>
      <details className="lg:col-span-2">
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-foreground md:min-h-0">Advanced</summary>
        <div className="mt-3 grid gap-x-8 gap-y-4 lg:grid-cols-2">
          <FormRow label="Jobber user" inline hint="Where their visits go while Jobber is the field display">
            <CommitInput label={`${name} Jobber user`} value={person.jobberUserId ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "jobberUserId", v, a))} />
          </FormRow>
          <FormRow label="Schedule label" inline hint="What names their row on the Schedule. Blank, and they take no visits.">
            <CommitInput label={`${name} schedule label`} value={person.truck ?? ""} onCommit={(v) => apply((s, a) => setPersonText(s, person.id, "truck", v, a))} />
          </FormRow>
        </div>
      </details>
    </>
  )
}

export function People({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { people } = state.settings
  return (
    <SettingsList
      title="People"
      changes={state.changes}
      description="Who works here and how they are scheduled. A second person on the Schedule is a new row: a name, an email, Takes visits, days and hours."
      action={
        <Button variant="outline" onClick={() => apply((s, a) => addPerson(s, a))}>
          <Plus className="size-4" aria-hidden />
          Add person
        </Button>
      }
      empty={{ title: "No people yet", line: "Add a person who takes visits and the scheduler has someone to give visits to." }}
      rows={people.map((person) => ({
        id: person.id,
        title: person.name,
        subtitle: `${ROLE_WORDS[person.role]}${person.truck ? ", takes visits" : ", takes no visits"}`,
        aside: (
          <ConfirmButton
            label={`Remove ${person.name}`}
            title={`Remove ${person.name}?`}
            description="They can no longer sign in and the next schedule run stops giving them visits. Visits already theirs keep their day until you move them."
            confirm="Remove person"
            onConfirm={() => apply((s, a) => removePerson(s, person.id, a))}
          />
        ),
        children: <PersonFacts person={person} apply={apply} />,
      }))}
    />
  )
}
