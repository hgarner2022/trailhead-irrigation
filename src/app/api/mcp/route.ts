import { handleMcp } from "@/api/mcp"

export const dynamic = "force-dynamic"

export const POST = (request: Request) => handleMcp(request)
export const GET = (request: Request) => handleMcp(request)
export const DELETE = (request: Request) => handleMcp(request)
