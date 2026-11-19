import { z } from "zod"
import { Id } from "../shared"

export const PhotoOut = z.object({
  id: Id,
  visitId: Id,
  jobId: Id,
  customerId: Id,
  /** `/api/photos/<id>`: the one address a browser uses; the route checks who is asking. The file's own address in the private store is never served. */
  url: z.string(),
  contentType: z.string(),
  bytes: z.number().int(),
  /** `customer` for the customer's own upload; for staff, who added it as an event's `who` reads (the email), left out for a customer, who is told `staff`. */
  addedBy: z.string(),
  /** the person's name, looked up by email like `event.who`; null for the customer's own and for a customer reading */
  addedByName: z.string().nullable(),
  byCustomer: z.boolean(),
  shownToCustomer: z.boolean(),
  /** whether this caller may delete it (the person who added it, an owner, a key with the admin scope; a customer their own) */
  canRemove: z.boolean(),
  createdAt: z.string(),
})
export type PhotoOutType = z.infer<typeof PhotoOut>

export const PhotoList = z.object({ data: z.array(PhotoOut) })
