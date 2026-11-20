// The people of the walkthrough's world who have jobs, invoices or quotes but no hand-shaped page (Andrea, Marcus, Dale, Priya, Hal, Ivy and Gus have
// those). One small fixture each: who they are, how to reach them, where the property is, when they first came, and the card or the yard when there
// is one. Everything else on their customer page (jobs, invoices, payments, messages, the notes, the status) is worked out from their jobs, invoices and
// quotes by `buildWorldCustomer`, never typed here. Pure data with no imports, so the job and invoice fixtures can read their contact details from it.

export interface WorldCustomer {
  name: string
  /** (970) 555-01xx */
  phone: string
  email: string
  /** how they want to hear from us */
  channel: "text" | "email"
  street: string
  town: string
  /** the day the first record about them was made, ISO */
  since: string
  /** where the yes to the terms came from; the website unless the office took it */
  source?: "Website" | "Phone, by the office"
  card?: { brand: string; last4: string; expires: string }
  /** zones, controller, gate code: only when a visit has happened */
  yard?: [zones: string, controller: string, gate: string]
  /** marketing email is on (they ticked the box) */
  marketingEmail?: boolean
  /** a mark only; the reason stays out unless someone wrote one */
  doNotService?: { reason?: string }
}

const W = (w: WorldCustomer): WorldCustomer => w

export const WORLD_CUSTOMERS: Record<string, WorldCustomer> = {
  "other-reese-holloway": W({ name: "Reese Holloway", phone: "(970) 555-0152", email: "reese.holloway@example.com", channel: "email", street: "51 Shadow Ln", town: "Firestone", since: "2026-10-30", yard: ["6", "Hunter Pro-C, garage", "None"] }),
  "other-joe-alvarez": W({ name: "Joe Alvarez", phone: "(970) 555-0113", email: "joe.alvarez@example.com", channel: "text", street: "22 Pine St", town: "Louisville", since: "2026-08-14", source: "Phone, by the office", yard: ["5", "Rain Bird ESP, basement", "None"] }),
  "other-lena-park": W({ name: "Lena Park", phone: "(970) 555-0127", email: "lena.park@example.com", channel: "text", street: "7 Oak Ct", town: "Lafayette", since: "2026-06-09", card: { brand: "Visa", last4: "3355", expires: "09/28" }, yard: ["7", "Rachio 3, garage", "2290"], marketingEmail: true }),
  "other-greg-olsen": W({ name: "Greg Olsen", phone: "(970) 555-0123", email: "greg.olsen@example.com", channel: "text", street: "5 Birch Ln", town: "Erie", since: "2026-09-21", yard: ["8", "Hunter Pro-C, garage", "None"] }),
  "other-sam-ortiz": W({ name: "Sam Ortiz", phone: "(970) 555-0119", email: "sam.ortiz@example.com", channel: "text", street: "14 Aspen Dr", town: "Firestone", since: "2026-07-02", card: { brand: "Visa", last4: "8821", expires: "03/29" }, yard: ["6", "Rachio 3, garage", "None"] }),
  "other-dana-cho": W({ name: "Dana Cho", phone: "(970) 555-0171", email: "dana.cho@example.com", channel: "text", street: "18 Cedar Way", town: "Erie", since: "2026-03-18", card: { brand: "Visa", last4: "4242", expires: "08/28" }, yard: ["8", "Rachio 3, garage", "None"] }),
  "other-priya-shah": W({ name: "Priya Shah", phone: "(970) 555-0167", email: "priya.shah@example.com", channel: "text", street: "330 Elm Dr", town: "Lafayette", since: "2026-10-06", yard: ["9", "Rain Bird ESP, garage", "None"] }),
  "other-tom-becker": W({ name: "Tom Becker", phone: "(970) 555-0135", email: "tom.becker@example.com", channel: "text", street: "600 Hill Rd", town: "Broomfield", since: "2026-08-22", doNotService: {}, yard: ["10", "Not set", "None"] }),
  "other-ana-ruiz": W({ name: "Ana Ruiz", phone: "(970) 555-0138", email: "ana.ruiz@example.com", channel: "text", street: "9 Laurel St", town: "Louisville", since: "2026-11-09" }),
  "other-beth-orr": W({ name: "Beth Orr", phone: "(970) 555-0159", email: "beth.orr@example.com", channel: "email", street: "33 Aspen Ct", town: "Lafayette", since: "2026-11-09" }),
  "other-nora-quinn": W({ name: "Nora Quinn", phone: "(970) 555-0148", email: "nora.quinn@example.com", channel: "text", street: "12 Elk Ct", town: "Louisville", since: "2026-11-10", card: { brand: "Visa", last4: "4242", expires: "08/28" } }),
  "other-owen-pratt": W({ name: "Owen Pratt", phone: "(970) 555-0166", email: "owen.pratt@example.com", channel: "email", street: "40 Hill St", town: "Erie", since: "2026-11-11" }),
  "other-ravi-shah": W({ name: "Ravi Shah", phone: "(970) 555-0192", email: "ravi.shah@example.com", channel: "text", street: "8 Willow Dr", town: "Firestone", since: "2026-11-05" }),
}

/** Customers made in the prototype (New job with a new customer, a request turned into a job): they join the world until Start over. */
const MADE = new Map<string, WorldCustomer>()
export const registerWorldCustomer = (id: string, c: WorldCustomer) => void MADE.set(id, c)
export const clearWorldCustomers = () => MADE.clear()
export const worldCustomer = (id: string): WorldCustomer | undefined => WORLD_CUSTOMERS[id] ?? MADE.get(id)
/** Every id the fixtures and the prototype know, in the order the Customers list shows them after the seven with hand-shaped pages. */
export const worldCustomerIds = (): string[] => [...Object.keys(WORLD_CUSTOMERS), ...MADE.keys()]
