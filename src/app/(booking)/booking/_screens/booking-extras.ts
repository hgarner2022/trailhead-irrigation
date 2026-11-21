// The service-specific answers of the booking form's details step (the Rachio install's controller and Wi-Fi, water efficiency's goals, the installation visit's project and area), and the review rows
// they add. Split out of booking-form-model.ts; that file re-exports it, so every import still works. Pure.
import type { ReviewRow } from "@/components/blocks/BookingReview"
import type { ServiceEntry } from "@/lib/booking/services"

/** What a service-specific question may be answered with, and the answers held for it. */
export const CONTROLLER_BRANDS = ["Not sure", "Hunter", "Rain Bird", "Rachio", "Toro", "Orbit", "Irritrol", "Other"] as const
export const EFFICIENCY_GOALS = ["A high water bill", "Dry spots", "A garden bed to put on drip"] as const
export type Wifi = "yes" | "no" | "unsure"
export type InstallType = "new" | "replace"
export interface Extras {
  /** Rachio: the controller there now */
  brand: string
  /** Rachio: Wi-Fi at the controller */
  wifi: Wifi | null
  /** Water efficiency: what to improve */
  goals: string[]
  /** Installation: a new lawn or replacing a system */
  installType: InstallType | null
  /** Installation: the rough area, square feet */
  area: string
}
export const NO_EXTRAS: Extras = { brand: "", wifi: null, goals: [], installType: null, area: "" }
export const WIFI_WORDS: Record<Wifi, string> = { yes: "Yes", no: "No", unsure: "Not sure" }
export const INSTALL_WORDS: Record<InstallType, string> = { new: "A new lawn", replace: "Replacing a system" }

/** The review rows a service-specific answer adds. */
export function extraRows(service: ServiceEntry, x: Extras, go: () => void): ReviewRow[] {
  const rows: ReviewRow[] = []
  if (service.details === "rachio") {
    if (x.brand) rows.push({ label: "Controller now", value: x.brand, onChange: go })
    if (x.wifi) rows.push({ label: "Wi-Fi at the controller", value: WIFI_WORDS[x.wifi], onChange: go })
  }
  if (service.details === "efficiency" && x.goals.length) rows.push({ label: "To improve", value: x.goals, onChange: go })
  if (service.details === "install") {
    if (x.installType) rows.push({ label: "Project", value: INSTALL_WORDS[x.installType], onChange: go })
    if (x.area.trim()) rows.push({ label: "Rough area", value: `${x.area.trim()} square feet`, onChange: go })
  }
  return rows
}

