// The words of the crew options in the Schedule and Move dialogs (Hannah, Nov 19 2026: assigned people are texted only when the box is on,
// and one optional line goes into the assigned text and shows on the trip). Pure strings.

export const CREW_LINE_MAX = 140

/** What the assigned person reads: "Trailhead: you're on 480 Briggs St, Tue Nov 24 at 12:00 pm, Sprinkler repair. Gate code in the note." */
export const crewText = (o: { day: string; time: string; address: string; service: string; instructions?: string }): string => {
  const when = `${o.day.replace(",", "")}${o.time === "Any time" ? "" : ` at ${o.time}`}`
  const extra = o.instructions?.trim() ? ` ${o.instructions.trim()}` : ""
  return `Trailhead: you're on ${o.address}, ${when}, ${o.service}.${extra}`
}

/** The confirm sentence: what the customer is told, and, when the box is on, what the crew is told. */
export const notices = (o: { first: string; channel: "text" | "email"; others: string[] }): string => {
  const customer = `${o.first} gets ${o.channel === "email" ? "an email" : "a text"} with the day and time.`
  return o.others.length ? `${customer} ${o.others.join(" and ")} gets a text that it's assigned.` : customer
}
