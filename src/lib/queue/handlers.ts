import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import { syncTruckFeed } from "@/lib/jobber-feed"
import type { QueueHandler, QueueKind } from "./index"

/** `jobber-feed-sync`: payload `{ truckId }`; reads that truck's calendar feed into busy blocks. */
export const jobberFeedSync: QueueHandler = async (db, item) => {
  const { truckId } = item.payload as { truckId: string }
  const [truck] = await db.select().from(s.truck).where(eq(s.truck.id, truckId))
  if (truck && truck.organizationId === item.organizationId) await syncTruckFeed(db, truck)
}

export const handlers: Partial<Record<QueueKind, QueueHandler>> = { "jobber-feed-sync": jobberFeedSync }
