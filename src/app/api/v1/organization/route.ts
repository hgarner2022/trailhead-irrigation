import { route } from "@/api/core/route"
import { organizationGet } from "@/api/v1/organization/handlers"

export const GET = route(organizationGet)
