import { route } from "@/api/core/route"
import { peopleList, peopleCreate } from "@/api/v1/people/handlers"

export const GET = route(peopleList)
export const POST = route(peopleCreate)
