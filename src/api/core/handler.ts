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
  /** a customer who holds one visit's signed link (a text's link, no sign-in) may call it too, for that one visit: `input.id` must be that visit */
  visitLink?: true
  /**
   * the anonymous checkout visitor (`public` principal) may call it; "own-pass" also needs `input.id` to be the pass the visitor is buying;
   * "own-invoice" is for the pay page: it needs `input.id` to be the invoice the visitor's signed link opened, and a visitor with such a link may call nothing else
   */
  checkout?: true | "own-pass" | "own-invoice"
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
