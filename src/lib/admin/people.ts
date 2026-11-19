import type { Person, PersonRole } from "./types"

/** The role as the screens say it. */
export const ROLE_WORDS: Record<PersonRole, string> = { owner: "Owner", admin: "Admin", tech: "Tech" }
export const ROLES: readonly PersonRole[] = ["owner", "admin", "tech"]

/**
 * On the schedule: the people with a truck to drive. Visits are assigned to these and to no one else.
 * Correct only over the active list (the screens' `settings.people` is the API's active list); a row that
 * may be out of service goes through the API's `isRoutePerson`, which also reads `active`.
 */
export const onRoute = (p: Pick<Person, "truck">): boolean => Boolean(p.truck)
export const routePeople = <P extends Pick<Person, "truck">>(people: readonly P[]): P[] => people.filter(onRoute)

/** What carries hours: a person as the screens hold them (absent) or as the database does (null). */
export type HoursFields = { hoursStart?: string | null; hoursEnd?: string | null }
/** The hours a person works when none are saved: 9 to 5. */
export const DEFAULT_HOURS = { start: "09:00", end: "17:00" } as const
/** "HH:MM", 00:00 to 23:59; what the hours columns hold. */
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const minuteOfDay = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
/** A person's working hours, the saved ones or 09:00 to 17:00. */
export const hoursOf = (p: HoursFields): { start: string; end: string } => ({ start: p.hoursStart ?? DEFAULT_HOURS.start, end: p.hoursEnd ?? DEFAULT_HOURS.end })
/** The length of a person's working day in minutes; never below zero. */
export function hoursMinutes(p: HoursFields): number {
  const { start, end } = hoursOf(p)
  return Math.max(0, minuteOfDay(end) - minuteOfDay(start))
}
/** "09:00 to 17:00", as the change log and the screen say hours. */
export const hoursWords = (p: HoursFields): string => {
  const { start, end } = hoursOf(p)
  return `${start} to ${end}`
}
/** True when `end` is later than `start`; both "HH:MM". */
export const hoursInOrder = (start: string, end: string): boolean => HHMM.test(start) && HHMM.test(end) && minuteOfDay(end) > minuteOfDay(start)

/** "Ryan" from "Ryan Garner"; null for no person or a blank name, so a message says nothing about who rather than half a sentence. */
export function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0]
  return first ? first : null
}

/** "Ryan Garner" gives RG; a one-word name gives its first two letters. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return (words.length >= 2 ? words.slice(0, 2).map((w) => w.charAt(0)).join("") : (words[0] ?? "").slice(0, 2)).toUpperCase()
}

/** The longest a person's text field may be, the API's own caps; the reducers refuse a longer value and `settingsProblems` checks once more before Save. */
export const TEXT_MAX = { name: 80, email: 254, phone: 40, truck: 40, jobberUserId: 80 } as const

/** The one rule behind "Keep at least one owner.": an owner in the list other than `exceptId`; with no id, any owner at all. */
export const hasAnotherOwner = (people: readonly Pick<Person, "id" | "role">[], exceptId?: string): boolean => people.some((p) => p.id !== exceptId && p.role === "owner")

/** The name a visit shows for who has it: the visit's own, else the person's from the list, else nothing. */
export function personNameOf(visit: { personId?: string; personName?: string }, people: readonly Pick<Person, "id" | "name">[]): string {
  return visit.personName ?? (visit.personId ? (people.find((p) => p.id === visit.personId)?.name ?? "") : "")
}
