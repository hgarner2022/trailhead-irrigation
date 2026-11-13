import type { AdminData } from "../types"

/**
 * The catalog's customers with contact details. The anonymised snapshot
 * carries no email and no phone (a test keeps it that way), so the stories
 * add made-up ones here, from the name: `andrea.dalton@example.com` and a
 * 970 555 number nobody owns. Only Storybook and the screen tests call this.
 */
export function withFixtureContact(data: AdminData): AdminData {
  return {
    ...data,
    clients: data.clients.map((c, i) => ({
      ...c,
      email: `${c.firstName.toLowerCase()}.${(c.lastName ?? "customer").toLowerCase()}@example.com`,
      phone: `+1970555${String(1000 + ((i * 37) % 9000)).padStart(4, "0")}`,
    })),
  }
}
