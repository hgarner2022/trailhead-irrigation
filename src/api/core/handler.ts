import type { z } from "zod"
import type { Scope } from "@/lib/auth/types"
import type { Ctx } from "./context"

export interface Handler<I extends z.ZodObject = z.ZodObject, O extends z.ZodType = z.ZodType> {
  /** "passes.list": the name the OpenAPI operation, the MCP tool and the call log share */
  name: string
  method: "GET" | "POST" | "PATCH" | "DELETE"
  /** "/passes/{id}", relative to /api/v1 */
  path: string
  scope: Scope
  /** a signed-in customer may also call it; the handler must then check the record is theirs */
  customerSelf?: boolean
  /** the output carries a secret shown once: an Idempotency-Key replay is refused instead of storing it */
  returnsSecret?: boolean
  /** the HTTP status of a success (201 for creates) */
  status?: 200 | 201
  /** one object: path parameters, query and body are merged into it */
  input: I
  output: O
  summary: string
  run(ctx: Ctx, input: z.infer<I>): Promise<z.infer<O>>
}

export type AnyHandler = Handler<z.ZodObject, z.ZodType>

export const defineHandler = <I extends z.ZodObject, O extends z.ZodType>(h: Handler<I, O>) => h
