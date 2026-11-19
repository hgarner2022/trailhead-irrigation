/**
 * The People tab's reducers (see settings-model.ts for the shape): the name,
 * the contact fields, the role, whether the person takes visits (the schedule
 * label), the working days, the hours, the most of each kind per day, and a
 * person joining or leaving the list. The season reducer stays for the engine
 * step; the screen no longer shows it. The last owner can
 * neither leave nor stop being an owner, the same rule the API keeps.
 */
import type { CapacityKind, OrganizationSettings, Person, PersonRole, Weekday } from "@/lib/admin/types"
import { WEEKDAYS } from "@/lib/admin/calendar"
import { emailProblem } from "@/lib/email-check"
import { HHMM, ROLE_WORDS, TEXT_MAX, hasAnotherOwner, hoursInOrder, hoursOf, hoursWords, initialsOf } from "@/lib/admin/people"
import { KIND_PLURALS, MAX_CAPACITY, daysWords, isRealDate, record, type Actor, type SettingsState } from "./settings-model"

const replacePerson = (s: OrganizationSettings, person: Person) => ({ ...s, people: s.people.map((p) => (p.id === person.id ? person : p)) })
const personOf = (state: SettingsState, id: string) => state.settings.people.find((p) => p.id === id)
/** Someone else is an owner, so this person may stop being one or leave. */
const anotherOwner = (state: SettingsState, id: string) => hasAnotherOwner(state.settings.people, id)

/** The initials follow the name. */
export function setPersonName(state: SettingsState, personId: string, raw: string, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  const name = raw.trim()
  if (!person || !name || name.length > TEXT_MAX.name) return state
  return record(state, actor, `${person.name} name`, person.name, name, replacePerson(state.settings, { ...person, name, initials: initialsOf(name) }))
}

/** The text fields a person has besides the name; a blank clears the field. */
export type PersonText = "email" | "phone" | "truck" | "jobberUserId"
const TEXT_WORDS: Record<PersonText, string> = { email: "email", phone: "phone", truck: "schedule label", jobberUserId: "Jobber user" }

/** A value too long for the API, or an email that is not shaped like one, is refused as the API would refuse it at Save. */
export function setPersonText(state: SettingsState, personId: string, field: PersonText, raw: string, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person) return state
  const value = raw.trim()
  if (value.length > TEXT_MAX[field]) return state
  if (field === "email" && value && emailProblem(value)) return state
  const next = { ...person }
  if (value) next[field] = value
  else delete next[field]
  return record(state, actor, `${person.name} ${TEXT_WORDS[field]}`, person[field] || "None", value || "None", replacePerson(state.settings, next))
}

/** The last owner stays an owner: a change that would leave none is refused. */
export function setPersonRole(state: SettingsState, personId: string, role: PersonRole, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person || !ROLE_WORDS[role]) return state
  if (person.role === "owner" && role !== "owner" && !anotherOwner(state, personId)) return state
  return record(state, actor, `${person.name} role`, ROLE_WORDS[person.role], ROLE_WORDS[role], replacePerson(state.settings, { ...person, role }))
}

/** The season a person works: a real date, the start no later than the end; a blank means all year. */
export function setSeason(state: SettingsState, personId: string, field: "seasonStart" | "seasonEnd", raw: string, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person) return state
  const value = raw.trim()
  if (value) {
    if (!isRealDate(value)) return state
    const start = field === "seasonStart" ? value : person.seasonStart
    const end = field === "seasonEnd" ? value : person.seasonEnd
    if (start && end && start > end) return state
  }
  const next = { ...person }
  if (value) next[field] = value
  else delete next[field]
  const words = field === "seasonStart" ? "season from" : "season to"
  return record(state, actor, `${person.name} ${words}`, person[field] || "All year", value || "All year", replacePerson(state.settings, next))
}

/** A person keeps at least one working day: the last one cannot be turned off. */
export function toggleWorkingDay(state: SettingsState, personId: string, day: Weekday, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person) return state
  const workingDays = WEEKDAYS.filter((d) => (d === day ? !person.workingDays.includes(d) : person.workingDays.includes(d)))
  if (workingDays.length === 0) return state
  return record(state, actor, `${person.name} working days`, daysWords(person.workingDays), daysWords(workingDays), replacePerson(state.settings, { ...person, workingDays }))
}

/**
 * Whether the person is a row on the Schedule. Today that is whether they carry a schedule label (the truck column), so turning it on
 * gives them one, their own name, and turning it off takes it away; the label itself is only edited under Advanced. The visits they
 * already hold keep their day.
 */
export function setTakesVisits(state: SettingsState, personId: string, takes: boolean, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person || Boolean(person.truck) === takes) return state
  const next = { ...person }
  if (takes) next.truck = person.name.trim().slice(0, TEXT_MAX.truck)
  else delete next.truck
  return record(state, actor, `${person.name} takes visits`, takes ? "No" : "Yes", takes ? "Yes" : "No", replacePerson(state.settings, next))
}

/**
 * One end of the working day, "HH:MM". Both ends are checked as they will stand: a day ends after it starts, so an end at or before
 * the start (or a start at or after the end) is refused. A blank puts the end back to its 09:00 or 17:00 default.
 */
export function setHours(state: SettingsState, personId: string, field: "hoursStart" | "hoursEnd", raw: string, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person) return state
  const value = raw.trim()
  if (value && !HHMM.test(value)) return state
  const next = { ...person }
  if (value) next[field] = value
  else delete next[field]
  const now = hoursOf(next)
  if (!hoursInOrder(now.start, now.end)) return state
  return record(state, actor, `${person.name} hours`, hoursWords(person), hoursWords(next), replacePerson(state.settings, next))
}

export function setCapacity(state: SettingsState, personId: string, kind: CapacityKind, n: number, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person || !Number.isInteger(n) || n < 0 || n > MAX_CAPACITY) return state
  const capacityByKind = { ...person.capacityByKind, [kind]: n }
  return record(state, actor, `${person.name} most ${KIND_PLURALS[kind]} per day`, String(person.capacityByKind[kind]), String(n), replacePerson(state.settings, { ...person, capacityByKind }))
}

/** The person leaves the list (Save takes them out of service); their visits are not touched here, the next schedule run no longer gives them any. The last owner stays. */
export function removePerson(state: SettingsState, personId: string, actor: Actor): SettingsState {
  const person = personOf(state, personId)
  if (!person) return state
  if (person.role === "owner" && !anotherOwner(state, personId)) return state
  const people = state.settings.people.filter((p) => p.id !== personId)
  return record(state, actor, "People", `${state.settings.people.length} (${person.name} included)`, `${people.length} (${person.name} removed)`, { ...state.settings, people })
}

/** A new tech with no truck yet, working Monday to Friday with nothing planned per day; the name is the first thing to type. */
export function addPerson(state: SettingsState, actor: Actor): SettingsState {
  const n = state.settings.people.length + 1
  const name = "New person"
  const person: Person = {
    id: `person-${n}-${actor.at}`,
    name,
    initials: initialsOf(name),
    role: "tech",
    workingDays: ["mon", "tue", "wed", "thu", "fri"],
    capacityByKind: { "turn-on": 0, inspection: 0, blowout: 0, repair: 0, other: 0 },
  }
  return record(state, actor, "People", String(n - 1), String(n), { ...state.settings, people: [...state.settings.people, person] })
}
