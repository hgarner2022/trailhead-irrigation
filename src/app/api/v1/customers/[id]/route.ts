import { route } from "@/api/core/route"
import { customersGet, customersUpdate } from "@/api/v1/customers/handlers"

export const GET = route(customersGet)
export const PATCH = route(customersUpdate)
