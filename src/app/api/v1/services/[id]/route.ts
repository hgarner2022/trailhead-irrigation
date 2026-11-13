import { route } from "@/api/core/route"
import { servicesUpdate, servicesDeactivate } from "@/api/v1/services/handlers"

export const PATCH = route(servicesUpdate)
export const DELETE = route(servicesDeactivate)
