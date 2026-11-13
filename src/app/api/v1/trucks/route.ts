import { route } from "@/api/core/route"
import { trucksList, trucksCreate } from "@/api/v1/trucks/handlers"

export const GET = route(trucksList)
export const POST = route(trucksCreate)
