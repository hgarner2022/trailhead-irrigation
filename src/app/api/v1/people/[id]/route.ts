import { route } from "@/api/core/route"
import { peopleUpdate, peopleDeactivate } from "@/api/v1/people/handlers"

export const PATCH = route(peopleUpdate)
export const DELETE = route(peopleDeactivate)
