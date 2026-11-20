// The first question of the booking form (Jobber's order: zip code, then services): does Trailhead come to this zip? Pure, over the same zip table the address check
// uses (`SERVICE_ZIPS`), so the zip step and the address step never disagree about a town.
import { SERVICE_ZIPS, SERVICE_AREA_SENTENCE } from "@/lib/places"
import type { Town } from "@/lib/admin/types"

export type ZipResult = { state: "idle" } | { state: "partial" } | { state: "ok"; town: Town; zip: string } | { state: "outside"; zip: string }

/** Only the digits, at most five: what the box keeps as the customer types or pastes ("80516-1234" gives 80516). */
export const cleanZip = (text: string) => text.replace(/\D/g, "").slice(0, 5)

export function zipCheck(text: string): ZipResult {
  const zip = cleanZip(text)
  if (zip.length === 0) return { state: "idle" }
  if (zip.length < 5) return { state: "partial" }
  const town = SERVICE_ZIPS[zip]
  return town ? { state: "ok", town, zip } : { state: "outside", zip }
}

export const ZIP_HELP = "Add your five-digit zip code so we can check we come to you."
export const zipServed = (town: Town) => `We work in ${town}.`
export const zipOutside = (zip: string) => `We don't serve ${zip} yet. ${SERVICE_AREA_SENTENCE}`
export const ZIP_WAY_OUT = "Not sure? Call Ryan."
