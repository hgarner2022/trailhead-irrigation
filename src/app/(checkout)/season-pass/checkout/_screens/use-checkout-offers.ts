import { useEffect, type Dispatch } from "react"
import { visitsOnSale } from "@/lib/season-pass"
import { fixtureOffers, type DayKind, type Offers } from "./checkout-days"
import type { CheckoutAction, CheckoutState } from "./checkout-state"
import type { OfferQuery } from "./checkout-submit"

/**
 * Reaching the days step asks the server for the open days at this address and zone count, every time: they change as trucks fill.
 * A failed lookup is an empty answer (those days come from Ryan), never a stopped checkout; with no `onOffer` the fixture days stand in.
 */
export function useCheckoutOffers(state: CheckoutState, dispatch: Dispatch<CheckoutAction>, onDays: boolean, season: number, onOffer?: (query: OfferQuery) => Promise<Offers>) {
  const { town, zones, inspection, today } = state
  useEffect(() => {
    if (!onDays || !town) return
    let live = true
    const kinds = visitsOnSale(inspection, today).map((v) => v.key as DayKind)
    const load = onOffer ? onOffer({ town, zones, inspection, season, today }) : Promise.resolve(fixtureOffers(season, kinds))
    load.then((offers) => live && dispatch({ type: "offered", offers })).catch(() => live && dispatch({ type: "offered", offers: {} }))
    return () => {
      live = false
    }
  }, [onDays, town, zones, inspection, today, season, onOffer, dispatch])
}
