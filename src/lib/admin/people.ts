import type { Person, PersonRole } from "./types"

/** The role as the screens say it. */
export const ROLE_WORDS: Record<PersonRole, string> = { owner: "Owner", admin: "Admin", tech: "Tech" }
export const ROLES: readonly PersonRole[] = ["owner", "admin", "tech"]

/** On the schedule: the people with a truck to drive. Visits are assigned to these and to no one else. */
export const onRoute = (p: Pick<Person, "truck">): boolean => Boolean(p.truck)
export const routePeople = <P extends Pick<Person, "truck">>(people: readonly P[]): P[] => people.filter(onRoute)

/** The name a visit shows for who has it: the visit's own, else the person's from the list, else nothing. */
export function personNameOf(visit: { personId?: string; personName?: string }, people: readonly Pick<Person, "id" | "name">[]): string {
  return visit.personName ?? (visit.personId ? (people.find((p) => p.id === visit.personId)?.name ?? "") : "")
}
