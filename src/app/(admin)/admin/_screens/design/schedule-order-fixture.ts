import type { GridBlock } from "@/components/blocks/time-grid-model"
import { pointNear } from "./schedule-prototype-data"
import { buildWalkWorld } from "./walkthrough/visits-data"

// Ryan's Thursday, Nov 19, for the Order the day story: his two stops with a time (Lafayette, Erie) and three with no set time, named so they are driven in a poor order (Longmont, Broomfield,
// Firestone). Ordering them into the gaps saves well over 20 minutes of driving. The unit test reads the saving.

export const ORDER_DAY = "2026-11-19"
const RYAN = "person_ryan"
const loose = (id: string, town: GridBlock["town"], title: string): GridBlock => ({ id, day: ORDER_DAY, personId: RYAN, start: null, minutes: 30, title, name: title.split(" ")[0]!, kind: "repair", town, service: "Repair" })

export function orderStory() {
  const world = buildWalkWorld()
  const extra = [loose("a-long", "Longmont", "Bross St"), loose("b-bro", "Broomfield", "Hill Rd"), loose("c-fire", "Firestone", "Aspen Dr")]
  return {
    visits: [...world.visits, ...extra],
    meta: { ...world.meta, ...Object.fromEntries(extra.map((b) => [b.id, { customer: `${b.name} Customer`, ...pointNear(b.town, b.id) }])) },
  }
}
