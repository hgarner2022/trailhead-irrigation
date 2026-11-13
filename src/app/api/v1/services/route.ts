import { route } from "@/api/core/route"
import { servicesList, servicesCreate } from "@/api/v1/services/handlers"

export const GET = route(servicesList)
export const POST = route(servicesCreate)
