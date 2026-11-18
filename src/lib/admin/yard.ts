// The one list of what is true about a yard (the property's nine facts). The API's `YardOut` and `PropertyOut` are built
// from this shape, the screens' `Yard` (src/lib/admin/types.ts) has the same keys (a type test in `yard.test.ts` keeps the
// two equal), and `YardWire` is what the API sends. No server-only: the screens' shaping reads the type, the schemas read the shape.
import { z } from "zod"

export const yardShape = {
  zones: z.number().int().nullable(),
  controller: z.string().nullable(),
  backflowLocation: z.string().nullable(),
  gateCode: z.string().nullable().optional().describe("Only for callers with the write scope."),
  mustBeHome: z.boolean(),
  accessNote: z.string().nullable().optional().describe("Only for callers with the write scope."),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable().optional().describe("Only for callers with the write scope."),
  notes: z.string().nullable(),
}

/** The yard as the API sends it: a fact nobody set is null, and the three the write scope gates are absent for anyone else. */
export type YardWire = z.infer<z.ZodObject<typeof yardShape>>
