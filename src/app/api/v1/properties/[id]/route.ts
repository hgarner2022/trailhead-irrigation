import { route } from "@/api/core/route"
import { propertiesUpdate } from "@/api/v1/properties/handlers"

export const PATCH = route(propertiesUpdate)
