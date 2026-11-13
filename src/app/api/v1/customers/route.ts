import { route } from "@/api/core/route"
import { customersList, customersCreate } from "@/api/v1/customers/handlers"

export const GET = route(customersList)
export const POST = route(customersCreate)
