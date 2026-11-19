import { z } from "zod"
import { Day, Id } from "../shared"

/** One open start time on an offered day, with the person it belongs to. */
export const OfferSlotOut = z.object({
  start: z.string().describe("HH:MM, Mountain, on the half hour."),
  end: z.string().describe("HH:MM: start plus the service's minutes."),
  personId: Id,
  personName: z.string(),
  added: z.number().describe("Minutes of drive this start adds to the person's day."),
  label: z.string().nullable().describe("\"Next to another Erie visit.\" or \"Close to another visit.\"; never a name or an address."),
})

/** One offered day from the offer rule (docs/plans/2026-11-18-scheduling-engine-design.md, section 4). */
export const OfferOut = z.object({
  day: Day,
  label: z.string().nullable().describe("\"We're already in Erie that day.\", \"We're close by that day.\", \"Soonest open day.\", or \"Soonest we can come.\" for a repair's first."),
  tier: z.union([z.literal(0), z.literal(1), z.literal(2)]).describe("0: stops in the customer's town that day; 1: a stop within ten minutes' drive; 2: any open day."),
  best: z.boolean().describe("The one day to preselect; the customer still taps."),
  same: z.number().int().describe("Stops already on the day in the customer's town."),
  near: z.number().nullable().describe("Drive minutes to the nearest stop that day; null when there are none."),
  slots: z.array(OfferSlotOut).describe("The day's open start times, least added drive first."),
})
export type OfferOut = z.infer<typeof OfferOut>
